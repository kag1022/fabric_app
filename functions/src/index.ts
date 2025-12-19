import { onObjectFinalized } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

const db = getFirestore();
const storage = getStorage();

const STORAGE_LIMIT_BYTES = 3 * 1024 * 1024 * 1024; // 3GB

export const manageStorageUsage = onObjectFinalized({
    region: "asia-northeast1", // 自分のリージョンに合わせる
}, async (event) => {
    const object = event.data;
    const filePath = object.name;

    if (!filePath || !filePath.startsWith("fabrics/")) {
        logger.log("Not a user fabric upload. Exiting.");
        return null;
    }

    const parts = filePath.split("/");
    if (parts.length < 3) {
        logger.log("Invalid file path structure.");
        return null;
    }
    const userId = parts[1];
    const bucket = storage.bucket(object.bucket);

    const [files] = await bucket.getFiles({ prefix: `fabrics/${userId}/` });

    let totalSize = 0;
    files.forEach((file) => {
        totalSize += Number(file.metadata.size || 0);
    });

    if (totalSize <= STORAGE_LIMIT_BYTES) {
        logger.log(`Usage for user ${userId} is ${totalSize} bytes. Within limit.`);
        return null;
    }

    logger.log(`Usage for user ${userId} is ${totalSize} bytes. Exceeds limit. Deleting old files.`);

    const fabricsRef = db.collection("users").doc(userId).collection("fabrics");
    const snapshot = await fabricsRef.orderBy("createdAt", "asc").get();

    let freedBytes = 0;
    const promises: Promise<any>[] = []; // 👈 "void" を "any" に修正

    for (const doc of snapshot.docs) {
        if (totalSize - freedBytes <= STORAGE_LIMIT_BYTES) {
            break;
        }

        const data = doc.data();
        const fileUrl = data.imageDataUrl;
        if (!fileUrl) continue;

        try {
            // URLからファイルパスを正しくデコードして抽出
            const decodedUrl = decodeURIComponent(fileUrl);
            const filePathInBucket = decodedUrl.split("/o/")[1].split("?")[0];
            const fileRef = storage.bucket(object.bucket).file(filePathInBucket);

            const [metadata] = await fileRef.getMetadata();
            const fileSize = Number(metadata.size || 0);

            promises.push(
                fileRef.delete().then(() => {
                    logger.log(`Deleted from Storage: ${fileRef.name}`);
                    return doc.ref.delete().then(() => {
                        logger.log(`Deleted from Firestore: ${doc.id}`);
                        freedBytes += fileSize;
                    });
                }),
            );
        } catch (error) {
            logger.error(`Failed to delete file for doc ${doc.id}:`, error);
            // StorageにファイルがなくてもFirestoreのドキュメントは削除する
            promises.push(doc.ref.delete());
        }
    }

    await Promise.all(promises);
    logger.log(`Freed ${freedBytes} bytes for user ${userId}.`);
    return null;
});

export const checkUploadRate = onObjectFinalized({
    region: "asia-northeast1",
}, async (event) => {
    const object = event.data;
    const filePath = object.name;

    if (!filePath || !filePath.startsWith("fabrics/")) {
        return null;
    }

    const parts = filePath.split("/");
    if (parts.length < 3) {
        return null;
    }
    const userId = parts[1];

    // 1. 統計データの記録
    const statsRef = db.collection("users").doc(userId).collection("upload_stats");
    await statsRef.add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        filePath: filePath
    });

    // 2. 過去1分間のアップロード数をチェック
    const oneMinuteAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 1000);
    const snapshot = await statsRef.where("timestamp", ">", oneMinuteAgo).get();

    const uploadCount = snapshot.size;

    if (uploadCount > 15) {
        logger.warn(`User ${userId} exceeded upload rate limit: ${uploadCount} uploads in 1 minute.`);

        // 制限フラグをセット
        await db.collection("users").doc(userId).set({
            uploadRestricted: true,
            restrictedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 今回のファイルを削除
        const bucket = storage.bucket(object.bucket);
        const file = bucket.file(filePath);
        try {
            await file.delete();
            logger.log(`Deleted rate-limited file: ${filePath}`);
        } catch (e) {
            logger.error(`Failed to delete rate-limited file: ${filePath}`, e);
        }
    } else {
        // 制限にかかっていない場合は、もし制限フラグがあれば解除する（または一定時間後に解除するロジックが必要だが、ここでは単純化のため、制限解除は別のプロセスか手動、あるいは次回正常時に解除などを検討。
        // 今回は「異常なときは止める」が要件なので、止めっぱなしにするか、時間を置いて解除するか。
        // シンプルに、制限閾値を下回ったら解除するというロジックを入れると、「16回目で制限 -> 次の瞬間1回(直近1分では16回) -> 制限継続」となる。
        // 時間が経てば直近1分間の数は減るので、次回のアップロード時に解除判定をすることができる。

        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists && userDoc.data()?.uploadRestricted) {
            // 直近1分が15回以下なら解除
            await db.collection("users").doc(userId).update({
                uploadRestricted: false
            });
            logger.log(`User ${userId} upload restriction lifted.`);
        }
    }

    // 古い統計データのクリーンアップ (1時間以上前など)
    // 毎回やるとコストがかかるので、確率的に行うか、別途Scheduled Functionにするのがベターだが、
    // ここでは簡易的に 1/10 の確率で実行
    if (Math.random() < 0.1) {
        const oneHourAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
        const oldDocs = await statsRef.where("timestamp", "<", oneHourAgo).get();
        const batch = db.batch();
        oldDocs.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
    return null;
});