import { NextRequest, NextResponse } from "next/server";
import { PricingClient, DescribeServicesCommand, GetProductsCommand, Service } from "@aws-sdk/client-pricing";
import { fromIni } from "@aws-sdk/credential-providers";

const pricingClient = new PricingClient({
  region: "us-east-1",
  credentials: fromIni({
    profile: process.env.AWS_PROFILE || 'default'
  })
});

export async function GET() {
  try {
    let allServices: Service[] = [];
    let nextToken: string | undefined;

    do {
      const command = new DescribeServicesCommand({
        NextToken: nextToken
      });
      
      const response = await pricingClient.send(command);
      if (response.Services) {
        allServices = [...allServices, ...response.Services];
      }
      nextToken = response.NextToken;
      
    } while (nextToken);

    return NextResponse.json({
      success: true,
      data: allServices
        .filter((service): service is Service & { ServiceCode: string } => 
          service.ServiceCode !== undefined
        )
        .map(service => service.ServiceCode)
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { service } = await req.json();
    let allProducts: Record<string, unknown>[] = [];
    let nextToken: string | undefined;

    do {
      const command = new GetProductsCommand({
        ServiceCode: service,
        NextToken: nextToken,
        MaxResults: 100, // 1回あたりの最大取得数
      });

      const response = await pricingClient.send(command);
      
      if (response.PriceList) {
        // 新しい製品を配列に追加
        const products = response.PriceList.map(item => JSON.parse(item.toString()));
        allProducts = [...allProducts, ...products];
      }

      nextToken = response.NextToken;
    } while (nextToken);

    // すべての製品から最初の製品の属性を抽出
    if (allProducts.length === 0) {
      throw new Error('No products found');
    }

    const attributes = (allProducts[0] as { product: { attributes: Record<string, unknown> } }).product.attributes;
    const attributeNames = Object.keys(attributes);

    console.log(service, attributeNames);

    return NextResponse.json({
      success: true,
      service,
      attributes: attributeNames,
      totalProducts: allProducts.length
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}