import {
  SynthUtils,
  expect as expectCDK,
  haveResourceLike,
} from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import { EventBridgeWebSocket } from '../lib';

describe('EventBridgeWebSocket', () => {
  it('snapshot test EventsRuleToSns default params', () => {
    const stack = new Stack();
    new EventBridgeWebSocket(stack, 'eventBridgeSocketDeploy', {
      bus: 'my-random-bus',
      eventPattern: {
        account: ['my-account'],
      },
      stage: 'dev',
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it('creates an API Gateway WEBSOCKET with onconnect and ondisconnect integrations', () => {
    const stack = new Stack();

    new EventBridgeWebSocket(stack, 'eventBridgeSocketDeploy', {
      bus: 'my-random-bus',
      eventPattern: {
        account: ['my-account'],
      },
      stage: 'dev',
    });

    // console.log(JSON.stringify(SynthUtils.toCloudFormation(stack), null, 4));
    expectCDK(stack).to(
      haveResourceLike('AWS::ApiGatewayV2::Api', {
        Name: 'EventBridgeSockets',
        ProtocolType: 'WEBSOCKET',
        RouteSelectionExpression: '$request.body.action',
      })
    );

    // on connect integration
    expectCDK(stack).to(
      haveResourceLike('AWS::ApiGatewayV2::Integration', {
        ApiId: {
          Ref: 'eventBridgeSocketDeployeventBridgeSocketDeployapiA13E2D47',
        },
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':apigateway:',
              {
                Ref: 'AWS::Region',
              },
              ':lambda:path/2015-03-31/functions/',
              {
                'Fn::GetAtt': [
                  'eventBridgeSocketDeployonconnectAE0ACD17',
                  'Arn',
                ],
              },
              '/invocations',
            ],
          ],
        },
      })
    );

    // expectCDK(stack).to(
    haveResourceLike('AWS::ApiGatewayV2::Route', {
      ApiId: {
        Ref: 'eventBridgeSocketDeployeventBridgeSocketDeployapiA13E2D47',
      },
      RouteKey: '$connect',
      Target: {
        'Fn::Join': [
          '',
          [
            'integrations/',
            {
              Ref: 'eventBridgeSocketDeployeventBridgeSocketDeployapiconnectRouteWebSocketIntegration449f455cb3c7748381eb0f0246ccfa2f05649A15',
            },
          ],
        ],
      },
    });

    expectCDK(stack).to(
      haveResourceLike('AWS::ApiGatewayV2::Integration', {
        ApiId: {
          Ref: 'eventBridgeSocketDeployeventBridgeSocketDeployapiA13E2D47',
        },
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':apigateway:',
              {
                Ref: 'AWS::Region',
              },
              ':lambda:path/2015-03-31/functions/',
              {
                'Fn::GetAtt': [
                  'eventBridgeSocketDeployondisconnect0F61A161',
                  'Arn',
                ],
              },
              '/invocations',
            ],
          ],
        },
      })
    );

    expectCDK(stack).to(
      haveResourceLike('AWS::ApiGatewayV2::Route', {
        ApiId: {
          Ref: 'eventBridgeSocketDeployeventBridgeSocketDeployapiA13E2D47',
        },
        RouteKey: '$disconnect',
        Target: {
          'Fn::Join': [
            '',
            [
              'integrations/',
              {
                Ref: 'eventBridgeSocketDeployeventBridgeSocketDeployapidisconnectRouteWebSocketIntegration0a84f9265d12d31c9984b952fd3b77202D79D90F',
              },
            ],
          ],
        },
      })
    );
  });

  it('creates a new EventBridge rule for given event bus and given event pattern', () => {
    const stack = new Stack();
    new EventBridgeWebSocket(stack, 'eventBridgeSocketDeploy', {
      bus: 'my-random-bus',
      eventPattern: {
        account: ['my-account'],
      },
      stage: 'dev',
    });

    expectCDK(stack).to(
      haveResourceLike('AWS::Events::Rule', {
        EventBusName: 'my-random-bus',
        EventPattern: {
          account: ['my-account'],
        },
      })
    );
  });
});
