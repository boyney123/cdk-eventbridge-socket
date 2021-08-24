import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { CfnApi, CfnIntegration, CfnRoute, CfnDeployment, CfnStage } from '@aws-cdk/aws-apigatewayv2';
import { Construct, RemovalPolicy, CfnOutput, Duration, ConcreteDependable, Stack } from '@aws-cdk/core';
import { Function, AssetCode, Runtime } from '@aws-cdk/aws-lambda';
import { PolicyStatement, Effect, ServicePrincipal, Role } from '@aws-cdk/aws-iam';
import { EventBus, Rule, EventPattern } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';

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

    //TODO: config: stageName (dev/stg/prd)

    /**
     * API Gateway (Websocket API)
     */
    const api = new CfnApi(this, name, {
      name: 'EventBridgeSockets',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
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
      readCapacity: 5,
      writeCapacity: 5,
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
          resources: ['arn:aws:execute-api:' + region + ':' + accountId + ':' + api.ref + '/*'],
          effect: Effect.ALLOW,
        }),
      ],
      environment: {
        TABLE_NAME: tableName,
        WEBSOCKET_API: `${api.attrApiEndpoint}/${stage}`,
      },
    });

    table.grantReadWriteData(connectFunc);
    table.grantReadWriteData(disconnectFunc);
    table.grantReadWriteData(eventBridgeBrokerFunc);

    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [connectFunc.functionArn, disconnectFunc.functionArn, eventBridgeBrokerFunc.functionArn],
      actions: ['lambda:InvokeFunction'],
    });

    const role = new Role(this, `${name}-iam-role`, {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    role.addToPolicy(policy);

    const connectIntegration = new CfnIntegration(this, 'connect-lambda-integration', {
      apiId: api.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: 'arn:aws:apigateway:' + region + ':lambda:path/2015-03-31/functions/' + connectFunc.functionArn + '/invocations',
      credentialsArn: role.roleArn,
    });

    const disconnectIntegration = new CfnIntegration(this, 'disconnect-lambda-integration', {
      apiId: api.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: 'arn:aws:apigateway:' + region + ':lambda:path/2015-03-31/functions/' + disconnectFunc.functionArn + '/invocations',
      credentialsArn: role.roleArn,
    });

    // create routes for API Gateway
    const connectRoute = new CfnRoute(this, 'connect-route', {
      apiId: api.ref,
      routeKey: '$connect',
      authorizationType: 'NONE',
      target: 'integrations/' + connectIntegration.ref,
    });

    const disconnectRoute = new CfnRoute(this, 'disconnect-route', {
      apiId: api.ref,
      routeKey: '$disconnect',
      authorizationType: 'NONE',
      target: 'integrations/' + disconnectIntegration.ref,
    });

    const deployment = new CfnDeployment(this, `${name}-deployment`, {
      apiId: api.ref,
    });

    new CfnStage(this, `${name}-stage`, {
      apiId: api.ref,
      autoDeploy: true,
      deploymentId: deployment.ref,
      stageName: stage,
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

    const dependencies = new ConcreteDependable();
    dependencies.add(connectRoute);
    dependencies.add(disconnectRoute);
    deployment.node.addDependency(dependencies);

    new CfnOutput(this, 'Websocket endpoint', { value: api.attrApiEndpoint });
  }

  private createFunction(name: string, tableName: string, options: any = {}) {
    return new Function(this, name, {
      code: new AssetCode(path.join(__dirname, `../lambda-fns/${name}`)),
      handler: `${name}.handler`,
      runtime: Runtime.NODEJS_12_X,
      timeout: Duration.seconds(300),
      memorySize: 256,
      environment: {
        TABLE_NAME: tableName,
      },
      ...options,
    });
  }
}
