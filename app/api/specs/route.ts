import { NextRequest, NextResponse } from 'next/server';
import { PricingClient, GetAttributeValuesCommand } from "@aws-sdk/client-pricing";
import { fromIni } from "@aws-sdk/credential-providers";

export const dynamic = 'force-dynamic'; // この行を追加

const pricingClient = new PricingClient({
  region: "us-east-1",
  credentials: fromIni({
    profile: process.env.AWS_PROFILE || 'default'
  })
});

interface AttributeValue {
  Value: string;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const service = url.searchParams.get('service') || 'AmazonEC2';
    const attribute = url.searchParams.get('attribute') || 'instanceType';

    let allValues: AttributeValue[] = [];
    let nextToken: string | undefined;

    do {
      const command = new GetAttributeValuesCommand({
        ServiceCode: service,
        AttributeName: attribute,
        NextToken: nextToken
      });
      
      const response = await pricingClient.send(command);
      if (response.AttributeValues) {
        allValues = [
          ...allValues,
          ...response.AttributeValues.map(attr => ({
            ...attr,
            Value: attr.Value || ''
          }))
        ];
      }
      nextToken = response.NextToken;
    } while (nextToken);

    return NextResponse.json({
      success: true,
      service,
      attribute,
      values: allValues.map(value => value.Value )
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}