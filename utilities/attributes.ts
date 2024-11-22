export const LambdaOptions = {
  memory: Array.from({ length: 80 }, (_, i) => (128 + i * 128))  // 128MB から 128MB 単位で 10,240MB まで
    .map(size => ({
      label: `${size}MB`,
      value: size.toString()
    })),
  duration: [
    { label: '100ms', value: '100' },
    { label: '500ms', value: '500' },
    { label: '1秒', value: '1000' },
    { label: '3秒', value: '3000' },
    { label: '5秒', value: '5000' },
    { label: '10秒', value: '10000' },
    { label: '15秒', value: '15000' },
  ],
  requests: [
    { label: '10,000 req/月', value: '10000' },
    { label: '100,000 req/月', value: '100000' },
    { label: '1,000,000 req/月', value: '1000000' },
    { label: '10,000,000 req/月', value: '10000000' },
    { label: '100,000,000 req/月', value: '100000000' },
  ]
};

export const AmplifyOptions = {
  buildMinutes: [
    { label: '100分/月', value: '100' },
    { label: '500分/月', value: '500' },
    { label: '1000分/月', value: '1000' },
    { label: '5000分/月', value: '5000' }
  ],
  storage: [
    { label: '1 GB', value: '1' },
    { label: '5 GB', value: '5' },
    { label: '10 GB', value: '10' },
    { label: '50 GB', value: '50' },
    { label: '100 GB', value: '100' }
  ],
  dataTranfer: [
    { label: '1 GB', value: '1' },
    { label: '10 GB', value: '10' },
    { label: '50 GB', value: '50' },
    { label: '100 GB', value: '100' },
    { label: '500 GB', value: '500' }
  ]
};

export const AppSyncOptions = {
  queries: [
    { label: '100,000回/月', value: '100000' },
    { label: '500,000回/月', value: '500000' },
    { label: '1,000,000回/月', value: '1000000' },
    { label: '5,000,000回/月', value: '5000000' },
    { label: '10,000,000回/月', value: '10000000' }
  ],
  subscriptionMinutes: [
    { label: '1,000分/月', value: '1000' },
    { label: '10,000分/月', value: '10000' },
    { label: '100,000分/月', value: '100000' },
    { label: '500,000分/月', value: '500000' }
  ],
  dataTransfer: [
    { label: '1 GB/月', value: '1' },
    { label: '10 GB/月', value: '10' },
    { label: '50 GB/月', value: '50' },
    { label: '100 GB/月', value: '100' }
  ]
};

export const Attributes = {
  AmazonEC2: [
    'instanceType',
    'regionCode'
  ],
  AWSAmplify: [
    'buildMinutes',  // ビルド時間（分/月）
    'storage',       // ストレージ使用量（GB）
    'dataTranfer',   // データ転送量（GB）
    'regionCode'     // リージョン
  ],
  AWSLambda: [
    'memory',     // メモリサイズ (128MB ~ 10,240MB)
    'duration',   // 実行時間 (ms)
    'requests',   // 月間リクエスト数
    'regionCode'  // リージョン
  ],
  AWSAppSync: [
    'queries',              // クエリ実行回数/月
    'subscriptionMinutes',  // サブスクリプション接続時間（分）
    'dataTransfer',         // データ転送量（GB）
    'regionCode'            // リージョン
  ]
};

export type Attribute = typeof Attributes;
export type AttributeName = keyof Attribute;