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