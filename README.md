# Fabric Color Classifier

このアプリケーションは、デバイスのカメラで布地の写真を撮影し、その色を自動で分析・分類して、パーソナルなデジタルギャラリーに保存するためのWebアプリケーションです。ReactとFirebaseを使用して構築されており、シンプルさとアクセシビリティを重視して設計されています。



## 主な機能

* **カメラ撮影機能**: デバイスのカメラを直接使用して布地の画像をキャプチャします。
* **高精度な自動色分析**: 撮影した画像から、k-meansクラスタリングアルゴリズムを用いて最大5つの主要な色（ドミナントカラー）を抽出します。これにより、単一の平均色よりも精度の高い分析が可能です。
* **カラーパレット表示**: 抽出したドミナントカラーをパレットとして表示し、布地の色構成を視覚的に確認できます。
* **自動グループ分け**: 分析結果に基づき、「C（色相）-（明度）」または「N（無彩色）-（明度）」の形式で布地を自動的にグループ分けします。
* **Firebaseバックエンド**: 撮影した画像データ、分析結果はすべてFirebaseに安全に保存されます。
    * **Authentication**: 匿名認証により、ユーザーごとにデータを管理します。
    * **Cloud Firestore**: 色分析結果や画像のURLなどのメタデータを保存します。
    * **Cloud Storage**: 撮影した画像ファイル本体を保存します。
* **ストレージ自動管理機能**: Cloud Functionsを利用し、ユーザー一人あたりのストレージ使用量が3GBを超えた場合、作成日時の古いものから自動的に削除してコストを管理します。
* **アクセシビリティ対応**: セマンティックなHTML、適切なARIA属性、キーボード操作への配慮など、アクセシビリティを考慮したUI設計を行っています。

## 🛠️ 技術スタック

#### フロントエンド
* **React** (with TypeScript)
* **Create React App**
* **Material-UI (MUI)**: UIコンポーネントライブラリ
* **ml-kmeans**: 色分析のためのk-meansクラスタリングライブラリ

#### バックエンド & デプロイ
* **Firebase**
    * Authentication
    * Cloud Firestore
    * Cloud Storage
    * Cloud Functions (for TypeScript)
* **Vercel**: フロントエンドのホスティング

---

## セットアップとローカルでの実行方法

このプロジェクトをローカル環境でセットアップし、実行するための手順です。

### 前提条件
* Node.js (v14以上)
* npm
* Firebase アカウント
* Google Cloud アカウント（Firebaseプロジェクトに紐づくもの）

### 1. プロジェクトのクローン
```bash
git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git)
cd YOUR_REPOSITORY
```

### 2. Firebase プロジェクトの準備
1.  [Firebaseコンソール](https://console.firebase.google.com/)で新しいプロジェクトを作成します。
2.  プロジェクト設定から、ウェブアプリを登録し、`firebaseConfig`オブジェクトを取得します。
3.  以下のFirebaseサービスを有効化してください:
    * **Authentication**: 匿名認証
    * **Cloud Firestore**: データベースを作成（テストモードで開始）
    * **Cloud Storage**: ストレージバケットを作成

### 3. 環境変数の設定
プロジェクトの**ルートディレクトリ**（`package.json`と同じ階層）に`.env.local`という名前のファイルを作成し、Firebaseから取得した`firebaseConfig`の値を入力します。

**.env.local**
```env
REACT_APP_API_KEY="YOUR_API_KEY"
REACT_APP_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
REACT_APP_PROJECT_ID="YOUR_PROJECT_ID"
REACT_APP_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
REACT_APP_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
REACT_APP_APP_ID="YOUR_APP_ID"
REACT_APP_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
```
**注意**: このファイルは`.gitignore`に含まれているため、GitHubには公開されません。

### 4. 依存関係のインストール
フロントエンドとバックエンド（Cloud Functions）の両方で、必要なパッケージをインストールします。

```bash
# 1. フロントエンド（Reactアプリ）の依存関係をインストール
npm install

# 2. バックエンド（Cloud Functions）の依存関係をインストール
cd functions
npm install
cd ..
```

### 5. ローカルサーバーの起動
以下のコマンドで、Reactアプリケーションがローカルで起動します。
```bash
npm start
```
ブラウザで `http://localhost:3000` が開きます。

---

## デプロイ方法

このアプリケーションは、フロントエンドとバックエンドを別々にデプロイする必要があります。

### 1. バックエンド（Cloud Functions）のデプロイ
ストレージ管理機能（`manageStorageUsage`）をFirebaseにデプロイします。

```bash
# functionsディレクトリに移動
cd functions

# Firebaseにデプロイ
npm run deploy -- --only functions
```
**注意**: 初回デプロイ時には、権限に関するエラーが発生することがあります。その場合は、エラーメッセージに表示される`gcloud`コマンドを[Google Cloud Shell](https://console.cloud.google.com/)で実行してください。

### 2. フロントエンド（React App）のデプロイ
VercelとGitHubリポジトリを連携させることで、`git push`をトリガーに自動でデプロイが実行されます。

1.  **Vercelプロジェクトの作成**: [Vercel](https://vercel.com/)で、このプロジェクトのGitHubリポジトリをインポートして新しいプロジェクトを作成します。
2.  **環境変数の設定**: Vercelのプロジェクト設定画面（Settings > Environment Variables）で、`.env.local`に設定したものと**全く同じキーと値**を登録します。
3.  **デプロイ**: `main`ブランチなどに`git push`すると、自動的にデプロイが開始されます。