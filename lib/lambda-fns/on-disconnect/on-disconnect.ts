const aws = require('aws-sdk');
const DynamoDBTable = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

exports.handler = async (event: any) => {
  const deleteParams = {
    TableName: process.env.TABLE_NAME,
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

export {};
