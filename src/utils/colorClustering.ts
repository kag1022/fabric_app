
import { kmeans } from 'ml-kmeans';

/**
 * 画像データからk-meansクラスタリングを使用してドミナントカラーを抽出する
 * @param data - ImageData.data (Uint8ClampedArray)
 * @param k - クラスタ数 (抽出するドミナントカラーの数)
 * @returns ドミナントカラーのRGB値の配列
 */
export function getDominantColors(data: Uint8ClampedArray, k: number): { r: number; g: number; b: number }[] {
  const pixels: number[][] = [];
  
  // 処理負荷を軽減するため、一定間隔でピクセルをサンプリングする
  const step = 4 * 5; // 5ピクセルごとに1ピクセルをサンプリング
  for (let i = 0; i < data.length; i += step) {
    // 配列の範囲チェック
    if (i + 2 < data.length) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      pixels.push([r, g, b]);
    }
  }

  if (pixels.length === 0) {
    console.warn("サンプリングされたピクセルがありません。");
    return [];
  }

  // k-meansクラスタリングを実行
  // NOTE: `ml-kmeans`は時々kよりも少ないクラスタを返すことがある
  const result = kmeans(pixels, k, { initialization: 'kmeans++' });
  
  // 各クラスタの重心（セントロイド）をドミナントカラーとする
  const dominantColors = result.centroids.map(centroid => ({
    r: Math.round(centroid[0]),
    g: Math.round(centroid[1]),
    b: Math.round(centroid[2]),
  }));

  // クラスタのサイズ（含まれるピクセル数）で色を並べ替える
  const clusterSizes = new Array(result.centroids.length).fill(0);
  result.clusters.forEach(clusterIndex => {
    clusterSizes[clusterIndex]++;
  });

  const sortedDominantColors = dominantColors
    .map((color, index) => ({
      ...color,
      size: clusterSizes[index],
    }))
    .sort((a, b) => b.size - a.size);

  return sortedDominantColors;
}
