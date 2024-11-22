import { NextRequest, NextResponse } from "next/server";
import { PricingClient, GetProductsCommand } from "@aws-sdk/client-pricing";
import { 
  CostExplorerClient, 
  GetCostAndUsageCommand
} from "@aws-sdk/client-cost-explorer";
import { fromIni } from "@aws-sdk/credential-providers";

interface AttributeData {
  memory?: string;
  duration?: string;
  requests?: string;
  buildMinutes?: string;
  storage?: string;
  dataTranfer?: string;
  queries?: string;
  subscriptionMinutes?: string;
  dataTransfer?: string;
  regionCode: string;
  [key: string]: string | undefined;
}

const pricingClient = new PricingClient({
  region: "us-east-1",
  credentials: fromIni({
    profile: process.env.AWS_PROFILE || 'default'
  })
});

const costExplorerClient = new CostExplorerClient({
  region: "us-east-1",
  credentials: fromIni({
    profile: process.env.AWS_PROFILE || 'default'
  })
});

// 実績データを取得する関数
async function getActualCost(service: string, instanceType: string) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

  const command = new GetCostAndUsageCommand({
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0]
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    Filter: {
      And: [
        {
          Dimensions: {
            Key: 'SERVICE',
            Values: [service]
          }
        },
        {
          Dimensions: {
            Key: 'INSTANCE_TYPE',
            Values: [instanceType]
          }
        }
      ]
    }
  });

  const response = await costExplorerClient.send(command);
  return response.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || '0';
}

async function calculateLambdaCost(attribute: AttributeData) {
  const memory = parseInt(attribute.memory || '0');
  const duration = parseInt(attribute.duration || '0');
  const requests = parseInt(attribute.requests || '0');
  
  // 1GB秒あたりの料金（$0.0000166667）
  const gbSeconds = (memory / 1024) * (duration / 1000);
  const computeCost = gbSeconds * 0.0000166667;
  
  // リクエストあたりの料金（$0.20 per 1M requests）
  const requestCost = (requests / 1000000) * 0.20;
  
  // 月間の合計コスト
  const monthlyCost = (computeCost + requestCost) * requests;
  
  return Math.round(monthlyCost * 150); // USD to JPY
}

async function calculateAmplifyCost(attribute: AttributeData) {
  const buildMinutes = parseInt(attribute.buildMinutes || '0');
  const storage = parseInt(attribute.storage || '0');
  const dataTranfer = parseInt(attribute.dataTranfer || '0');
  
  // ビルド時間の料金（最初の1000分は無料、その後$0.01/分）
  const buildCost = Math.max(0, buildMinutes - 1000) * 0.01;
  
  // ストレージ料金（最初の5GBは無料、その後$0.023/GB）
  const storageCost = Math.max(0, storage - 5) * 0.023;
  
  // データ転送料金（最初の15GBは無料、その後$0.15/GB）
  const transferCost = Math.max(0, dataTranfer - 15) * 0.15;
  
  // 月間の合計コスト（USD）
  const monthlyCost = buildCost + storageCost + transferCost;
  
  return Math.round(monthlyCost * 150); // USD to JPY
}

async function calculateAppSyncCost(attribute: AttributeData) {
  const queries = parseInt(attribute.queries || '0');
  const subscriptionMinutes = parseInt(attribute.subscriptionMinutes || '0');
  const dataTransfer = parseInt(attribute.dataTransfer || '0');

  // クエリ/ミューテーション料金
  // 最初の250,000回は無料、その後$4.00 per million
  const queryCost = Math.max(0, queries - 250000) * (4.00 / 1000000);

  // リアルタイムサブスクリプション料金
  // 最初���1,000,000分は無料、その後$0.02 per million minutes
  const subscriptionCost = Math.max(0, subscriptionMinutes - 1000000) * (0.02 / 1000000);

  // データ転送料金
  // 最初の1GBは無料、その後$0.09/GB
  const transferCost = Math.max(0, dataTransfer - 1) * 0.09;

  // 合計コスト（USD）
  const monthlyCost = queryCost + subscriptionCost + transferCost;

  return Math.round(monthlyCost * 150); // USD to JPY
}

export async function POST(req: NextRequest) {
  try {
    const { service, attribute } = await req.json();

    console.log('Service:', service);
    console.log('Attribute:', attribute);

    if (!service || !attribute.regionCode) {
      return NextResponse.json({
        success: false,
        error: 'service and region are required'
      }, { status: 400 });
    }

    // Lambdaの場合は独自の計算ロジックを使用
    if (service === 'AWSLambda') {
      const cost = await calculateLambdaCost(attribute);
      return NextResponse.json({
        success: true,
        data: {
          service,
          attribute,
          price: cost,
          actualCost: {
            lastMonth: "0",  // 実績は別途Cost Explorerで���得
            currency: "JPY"
          }
        }
      });
    }

    // Amplifyの場合は独自の計算ロジックを使用
    if (service === 'AWSAmplify') {
      const cost = await calculateAmplifyCost(attribute);
      return NextResponse.json({
        success: true,
        data: {
          service,
          attribute,
          price: cost,
          actualCost: {
            lastMonth: "0",
            currency: "JPY"
          }
        }
      });
    }

    if (service === 'AWSAppSync') {
      const cost = await calculateAppSyncCost(attribute);
      return NextResponse.json({
        success: true,
        data: {
          service,
          attribute,
          price: cost,
          actualCost: {
            lastMonth: "0",
            currency: "JPY"
          }
        }
      });
    }

    // const filterAttributes = Object.keys(attribute).filter(key => key !== 'regionCode');
    const filters = Object.keys(attribute).map(key => ({
      Type: "TERM_MATCH" as const,
      Field: key,
      Value: attribute[key]
    }));

    console.log('Filters:', filters);

    const command = new GetProductsCommand({
      ServiceCode: service,
      Filters: filters
    });

    const response = await pricingClient.send(command);

    console.log(response);
    
    if (!response.PriceList || response.PriceList.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No pricing information found'
      }, { status: 404 });
    }

    // 価格情報を解析して月額の日本円に変換
    const monthlyPrices = response.PriceList.map(item => {
      const priceData = JSON.parse(item.toString());
      const onDemandPricing = priceData.terms.OnDemand;
      
      let hourlyRate = 0;
      for (const termId in onDemandPricing) {
        const term = onDemandPricing[termId];
        for (const dimensionId in term.priceDimensions) {
          const dimension = term.priceDimensions[dimensionId];
          if (dimension.unit === 'Hrs') {
            hourlyRate = parseFloat(dimension.pricePerUnit.USD);
            break;
          }
        }
      }

      return Math.round(hourlyRate * 730 * 150); // 月額JPY
    });

    // 中央値を計算
    const sortedPrices = [...monthlyPrices].sort((a, b) => a - b);
    const middle = Math.floor(sortedPrices.length / 2);
    const medianPrice = sortedPrices.length % 2 === 0
      ? Math.round((sortedPrices[middle - 1] + sortedPrices[middle]) / 2)
      : sortedPrices[middle];

    // 実績データの取得
    const actualCost = await getActualCost(service, attribute.instanceType);
    const actualCostJPY = Math.round(parseFloat(actualCost) * 150);

    return NextResponse.json({
      success: true,
      data: {
        service,
        attribute,
        price: medianPrice,
        actualCost: {
          lastMonth: `${actualCostJPY}`,
          currency: "JPY"
        }
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
