const eventBridgeBroker = require('../../lib/lambda-fns/eventbridge-broker/eventbridge-broker.ts');

const mockDocumentScan = jest.fn((params: any) => Promise.resolve({ Items: [{ connectionId: 1 }] }));
const mockDocumentDelete = jest.fn((params: any) => Promise.resolve());
const mockApiGatewayPostToConnection = jest.fn((params: any) => Promise.resolve());

const event = {
  requestContext: {
    connectionId: 1,
  },
};

jest.mock('aws-sdk', () => ({
  ApiGatewayManagementApi: class {
    postToConnection(...params: any) {
      return {
        promise: () => mockApiGatewayPostToConnection(params),
      };
    }
  },
  DynamoDB: {
    DocumentClient: class {
      scan(...params: any) {
        return {
          promise: () => mockDocumentScan(params),
        };
      }
      delete(...params: any) {
        return {
          promise: () => mockDocumentDelete(params),
        };
      }
    },
  },
}));

describe('eventbridge-broker lambda function', () => {
  it('reads all the connections in the DynamoDB table and posts the given event to them', async () => {
    const response = await eventBridgeBroker.handler(event);
    expect(mockDocumentScan).toHaveBeenCalledWith([{ ProjectionExpression: 'connectionId', TableName: 'connections' }]);
    expect(mockApiGatewayPostToConnection).toHaveBeenCalledWith([{ ConnectionId: 1, Data: '{"requestContext":{"connectionId":1}}' }]);
    expect(response).toEqual({ body: 'Data sent.', statusCode: 200 });
  });

  it('deletes the connection from the DynamoDB table if failing to post data to the connected connection', async () => {
    mockApiGatewayPostToConnection.mockImplementationOnce(() => Promise.reject({ statusCode: 410 }));

    const response = await eventBridgeBroker.handler(event);
    expect(mockDocumentScan).toHaveBeenCalledWith([{ ProjectionExpression: 'connectionId', TableName: 'connections' }]);
    expect(mockDocumentDelete).toHaveBeenCalledWith([{ Key: { connectionId: 1 }, TableName: 'connections' }]);
    expect(response).toEqual({ body: 'Data sent.', statusCode: 200 });
  });

  it('returns a 500 status when failing to send data too all connections', async () => {
    mockApiGatewayPostToConnection.mockImplementationOnce(() => Promise.reject({ statusCode: 500 }));
    const response = await eventBridgeBroker.handler(event);
    expect(response.statusCode).toEqual(500);
  });
});

export {};
