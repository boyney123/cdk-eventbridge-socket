import * as AWS from 'aws-sdk';
import { DeleteItemInput } from 'aws-sdk/clients/dynamodb';
const DynamoDBTable = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION,
});

export const handler = async (event: any) => {
  const deleteParams: DeleteItemInput = {
    TableName: process.env.TABLE_NAME!,
    Key: {
      connectionId: event.requestContext.connectionId,
    },
  };

  try {
    await DynamoDBTable.delete(deleteParams).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to disconnect: ' + JSON.stringify(err) };
  }

  return { statusCode: 200, body: 'Disconnected' };
};
