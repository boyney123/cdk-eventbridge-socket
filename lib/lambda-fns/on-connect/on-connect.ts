const AWS = require('aws-sdk');

exports.handler = async (event: any) => {
  const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

  const putParams = {
    TableName: process.env.TABLE_NAME,
    Item: {
      connectionId: event.requestContext.connectionId,
    },
  };

  try {
    await ddb.put(putParams).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
  }

  return { statusCode: 200, body: 'Connected' };
};

export {};
