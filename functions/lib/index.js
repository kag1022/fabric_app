"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUploadRate = exports.manageStorageUsage = exports.deleteFabricRecord = exports.saveFabricRecord = void 0;
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const storage_2 = require("firebase-functions/v2/storage");
const logger = __importStar(require("firebase-functions/logger"));
admin.initializeApp();
const db = (0, firestore_1.getFirestore)();
const storage = (0, storage_1.getStorage)();
const REGION = 'asia-northeast1';
const STORAGE_LIMIT_BYTES = 3 * 1024 * 1024 * 1024;
const HUE_NAMES = new Set(['無彩色', '赤', 'オレンジ', '黄', '緑', 'シアン', '青', '紫', 'マゼンタ']);
const SATURATION_NAMES = new Set(['無彩色', '鈍い', '鮮やか']);
const VALUE_NAMES = new Set(['黒', '暗', '中', '明', '白']);
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function isNumberInRange(value, min, max) {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function isByte(value) {
    return Number.isInteger(value) && isNumberInRange(value, 0, 255);
}
function isOwnedStoragePath(userId, storagePath) {
    const prefix = `fabrics/${userId}/`;
    if (!storagePath.startsWith(prefix)) {
        return false;
    }
    const fileName = storagePath.slice(prefix.length);
    return /^[A-Za-z0-9_-]+\.jpg$/.test(fileName);
}
function assertOwnedStoragePath(userId, storagePath) {
    if (typeof storagePath !== 'string' || !isOwnedStoragePath(userId, storagePath)) {
        throw new https_1.HttpsError('invalid-argument', 'storagePath が不正です。');
    }
}
function normalizeAnalysisPayload(value) {
    if (!isRecord(value)) {
        throw new https_1.HttpsError('invalid-argument', 'analysis が不正です。');
    }
    const dominantRgb = value.dominantRgb;
    const hsv = value.hsv;
    const hueInfo = value.hueInfo;
    const saturationInfo = value.saturationInfo;
    const valueInfo = value.valueInfo;
    const group = value.group;
    if (!isRecord(dominantRgb) ||
        !isByte(dominantRgb.r) ||
        !isByte(dominantRgb.g) ||
        !isByte(dominantRgb.b)) {
        throw new https_1.HttpsError('invalid-argument', 'dominantRgb が不正です。');
    }
    if (!isRecord(hsv) ||
        !isNumberInRange(hsv.h, 0, 360) ||
        !isNumberInRange(hsv.s, 0, 1) ||
        !isNumberInRange(hsv.v, 0, 1)) {
        throw new https_1.HttpsError('invalid-argument', 'hsv が不正です。');
    }
    if (!isRecord(hueInfo) ||
        !Number.isInteger(hueInfo.category) ||
        !isNumberInRange(hueInfo.category, 0, 8) ||
        typeof hueInfo.name !== 'string' ||
        !HUE_NAMES.has(hueInfo.name)) {
        throw new https_1.HttpsError('invalid-argument', 'hueInfo が不正です。');
    }
    if (!isRecord(saturationInfo) ||
        typeof saturationInfo.name !== 'string' ||
        !SATURATION_NAMES.has(saturationInfo.name)) {
        throw new https_1.HttpsError('invalid-argument', 'saturationInfo が不正です。');
    }
    if (!isRecord(valueInfo) ||
        !Number.isInteger(valueInfo.category) ||
        !isNumberInRange(valueInfo.category, 0, 4) ||
        typeof valueInfo.name !== 'string' ||
        !VALUE_NAMES.has(valueInfo.name)) {
        throw new https_1.HttpsError('invalid-argument', 'valueInfo が不正です。');
    }
    if (typeof group !== 'string' || !/^(C[1-8]-[0-4]|N-[0-4])$/.test(group)) {
        throw new https_1.HttpsError('invalid-argument', 'group が不正です。');
    }
    return {
        dominantRgb: {
            r: dominantRgb.r,
            g: dominantRgb.g,
            b: dominantRgb.b,
        },
        group,
        hsv: {
            h: hsv.h,
            s: hsv.s,
            v: hsv.v,
        },
        hueInfo: {
            category: hueInfo.category,
            name: hueInfo.name,
        },
        saturationInfo: {
            name: saturationInfo.name,
        },
        valueInfo: {
            category: valueInfo.category,
            name: valueInfo.name,
        },
    };
}
function getSecurityDoc(userId) {
    return db.collection('users').doc(userId).collection('internal').doc('security');
}
exports.saveFabricRecord = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', '認証が必要です。');
    }
    const userId = request.auth.uid;
    assertOwnedStoragePath(userId, request.data.storagePath);
    const analysis = normalizeAnalysisPayload(request.data.analysis);
    const bucket = storage.bucket();
    const file = bucket.file(request.data.storagePath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new https_1.HttpsError('failed-precondition', '画像ファイルが見つかりません。');
    }
    const [metadata] = await file.getMetadata();
    if (metadata.contentType !== 'image/jpeg') {
        throw new https_1.HttpsError('invalid-argument', 'JPEG 画像のみ保存できます。');
    }
    const docRef = await db.collection('users').doc(userId).collection('fabrics').add(Object.assign(Object.assign({}, analysis), { createdAt: firestore_1.FieldValue.serverTimestamp(), storagePath: request.data.storagePath }));
    return { id: docRef.id };
});
exports.deleteFabricRecord = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', '認証が必要です。');
    }
    const userId = request.auth.uid;
    const fabricId = request.data.fabricId;
    if (typeof fabricId !== 'string' || fabricId.length === 0 || fabricId.length > 128) {
        throw new https_1.HttpsError('invalid-argument', 'fabricId が不正です。');
    }
    const docRef = db.collection('users').doc(userId).collection('fabrics').doc(fabricId);
    const documentSnapshot = await docRef.get();
    if (!documentSnapshot.exists) {
        return { ok: true };
    }
    const data = documentSnapshot.data();
    const storagePath = data === null || data === void 0 ? void 0 : data.storagePath;
    if (typeof storagePath === 'string' && isOwnedStoragePath(userId, storagePath)) {
        const file = storage.bucket().file(storagePath);
        const [exists] = await file.exists();
        if (exists) {
            await file.delete();
        }
    }
    await docRef.delete();
    return { ok: true };
});
exports.manageStorageUsage = (0, storage_2.onObjectFinalized)({
    region: REGION,
}, async (event) => {
    const object = event.data;
    const filePath = object.name;
    if (!filePath || !filePath.startsWith('fabrics/')) {
        return null;
    }
    const parts = filePath.split('/');
    if (parts.length !== 3) {
        logger.warn('Invalid storage path received.', { filePath });
        return null;
    }
    const userId = parts[1];
    const bucket = storage.bucket(object.bucket);
    const [files] = await bucket.getFiles({ prefix: `fabrics/${userId}/` });
    const totalSize = files.reduce((sum, file) => sum + Number(file.metadata.size || 0), 0);
    if (totalSize <= STORAGE_LIMIT_BYTES) {
        return null;
    }
    logger.log('Storage limit exceeded. Deleting oldest records.', { totalSize, userId });
    const fabricsRef = db.collection('users').doc(userId).collection('fabrics');
    const snapshot = await fabricsRef.orderBy('createdAt', 'asc').get();
    let currentSize = totalSize;
    for (const documentSnapshot of snapshot.docs) {
        if (currentSize <= STORAGE_LIMIT_BYTES) {
            break;
        }
        const data = documentSnapshot.data();
        const storagePath = data.storagePath;
        if (typeof storagePath !== 'string' || !isOwnedStoragePath(userId, storagePath)) {
            logger.warn('Removing record with invalid storage path.', {
                docId: documentSnapshot.id,
                userId,
            });
            await documentSnapshot.ref.delete();
            continue;
        }
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            await documentSnapshot.ref.delete();
            continue;
        }
        const [metadata] = await file.getMetadata();
        const fileSize = Number(metadata.size || 0);
        await file.delete();
        await documentSnapshot.ref.delete();
        currentSize -= fileSize;
        logger.log('Removed fabric during quota cleanup.', {
            docId: documentSnapshot.id,
            fileSize,
            userId,
        });
    }
    return null;
});
exports.checkUploadRate = (0, storage_2.onObjectFinalized)({
    region: REGION,
}, async (event) => {
    var _a;
    const object = event.data;
    const filePath = object.name;
    if (!filePath || !filePath.startsWith('fabrics/')) {
        return null;
    }
    const parts = filePath.split('/');
    if (parts.length !== 3) {
        return null;
    }
    const userId = parts[1];
    const statsRef = db.collection('users').doc(userId).collection('internalUploadStats');
    const securityRef = getSecurityDoc(userId);
    await statsRef.add({
        filePath,
        timestamp: firestore_1.FieldValue.serverTimestamp(),
    });
    const oneMinuteAgo = firestore_1.Timestamp.fromMillis(Date.now() - 60 * 1000);
    const snapshot = await statsRef.where('timestamp', '>', oneMinuteAgo).get();
    const uploadCount = snapshot.size;
    if (uploadCount > 15) {
        logger.warn('Upload rate limit exceeded.', { uploadCount, userId });
        await securityRef.set({
            restrictedAt: firestore_1.FieldValue.serverTimestamp(),
            uploadRestricted: true,
        }, { merge: true });
        const bucket = storage.bucket(object.bucket);
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        if (exists) {
            await file.delete();
        }
    }
    else {
        const securitySnapshot = await securityRef.get();
        if (securitySnapshot.exists && ((_a = securitySnapshot.data()) === null || _a === void 0 ? void 0 : _a.uploadRestricted)) {
            await securityRef.set({
                releasedAt: firestore_1.FieldValue.serverTimestamp(),
                uploadRestricted: false,
            }, { merge: true });
        }
    }
    if (Math.random() < 0.1) {
        const oneHourAgo = firestore_1.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
        const oldStats = await statsRef.where('timestamp', '<', oneHourAgo).get();
        if (!oldStats.empty) {
            const batch = db.batch();
            oldStats.docs.forEach((documentSnapshot) => batch.delete(documentSnapshot.ref));
            await batch.commit();
        }
    }
    return null;
});
//# sourceMappingURL=index.js.map