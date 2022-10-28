import { App, Duration, Stack } from 'aws-cdk-lib';
import { EventBus, Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { AwsApi, LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EventBridgeWebSocket } from '../lib';

const app = new App();

const stack = new Stack(app, 'example-stack');

const eventbus = new EventBus(stack, 'EventBus');

const eventPublisher = new NodejsFunction(stack, 'EventPublisher', {
  entry: 'example/event-publisher.ts',
  runtime: Runtime.NODEJS_16_X,
  environment: {
    EVENT_BUS_NAME: eventbus.eventBusName,
  },
});
eventbus.grantPutEventsTo(eventPublisher);

new Rule(stack, 'Rule', {
  schedule: Schedule.rate(Duration.minutes(1)),
  targets: [new LambdaFunction(eventPublisher)],
});

new EventBridgeWebSocket(stack, 'EventBridgeWebSocket', {
  bus: eventbus.eventBusName,

  eventPattern: {
    source: ['example.event.source'],
  },
  stage: 'test',
  authentication: true,
});
