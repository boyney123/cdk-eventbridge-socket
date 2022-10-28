import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { EventBus, EventPattern, Rule } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2-alpha';
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

const path = require('path');

export interface EventBridgeWebSocketProps {
  readonly bus: string;
  readonly stage?: string;
  readonly eventPattern?: EventPattern;
}

export class EventBridgeWebSocket extends Construct {
  constructor(scope: Construct, id: string, config: EventBridgeWebSocketProps) {
    super(scope, id);

    const region = Stack.of(this).region;
    const accountId = Stack.of(this).account;
    const stage = config.stage || 'dev';

    const tableName = `${id}-connections-table`;
    const name = id + '-api';

    /**
     * API Gateway (Websocket API)
     */
    const api = new WebSocketApi(this, name, {
      apiName: 'EventBridgeSockets',
    });

    /**
     * Table to manage connections
     */
    const table = new Table(this, `${id}-connections-table`, {
      tableName,
      partitionKey: {
        name: 'connectionId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /**
     * Create all required lambda functions
     */
    const connectFunc = this.createFunction('on-connect', tableName);
    const disconnectFunc = this.createFunction('on-disconnect', tableName);
    const eventBridgeBrokerFunc = this.createFunction('eventbridge-broker', tableName, {
      initialPolicy: [
        new PolicyStatement({
          actions: ['execute-api:ManageConnections'],
          resources: [`arn:aws:execute-api:${region}:${accountId}:${api.apiId}/*`],
          effect: Effect.ALLOW,
        }),
      ],
      environment: {
        TABLE_NAME: tableName,
        WEBSOCKET_API: `${api.apiEndpoint}/${stage}`,
      },
    });

    table.grantReadWriteData(connectFunc);
    table.grantReadWriteData(disconnectFunc);
    table.grantReadWriteData(eventBridgeBrokerFunc);

    // create routes for API Gateway
    api.addRoute('$connect', {
      integration: new WebSocketLambdaIntegration('ConnectIntegration', connectFunc),
    });
    api.addRoute('$disconnect', {
      integration: new WebSocketLambdaIntegration('DisconnectIntegration', disconnectFunc),
    });

    new WebSocketStage(this, `${name}-stage`, {
      autoDeploy: true,
      stageName: stage,
      webSocketApi: api,
    });

    /**
     * Get and add new rule for event bus with users event patterns.
     */
    const bus = EventBus.fromEventBusName(this, 'EventBus', config.bus);
    new Rule(this, `WebsocketRule`, {
      eventBus: bus,
      eventPattern: config?.eventPattern,
      targets: [new LambdaFunction(eventBridgeBrokerFunc)],
    });

    new CfnOutput(this, 'Websocket endpoint', {
      value: `${api.apiEndpoint}/${config?.stage}`,
    });
  }

  private createFunction(name: string, tableName: string, options: any = {}) {
    return new NodejsFunction(this, name, {
      entry: path.join(__dirname, `../lambda-fns/${name}/${name}.ts`),
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(300),
      memorySize: 256,
      environment: {
        TABLE_NAME: tableName,
      },
      ...options,
    });
  }
}
