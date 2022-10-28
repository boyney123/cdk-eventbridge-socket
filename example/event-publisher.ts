import { EventBridge } from 'aws-sdk';
import { randomUUID } from 'crypto';

var events = new EventBridge();
export const handler = async () => {
  var params = {
    Entries: [
      {
        Detail: JSON.stringify({ timestamp: new Date().toLocaleDateString(), payload: randomUUID() }),
        DetailType: 'ExampleEvent',
        EventBusName: process.env.EVENT_BUS_NAME,
        Source: 'example.event.source',
      },
    ],
  };
  await events.putEvents(params).promise();
};
