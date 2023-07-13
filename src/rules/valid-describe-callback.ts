import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import {
  createRule,
  getAccessorValue,
  isFunction,
  parseJestFnCall,
} from './utils';

const paramsLocation = (
  params: TSESTree.CallExpressionArgument[] | TSESTree.Parameter[],
) => {
  const [first] = params;
  const last = params[params.length - 1];

  return {
    start: first.loc.start,
    end: last.loc.end,
  };
};

export default createRule({
  name: __filename,
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce valid `describe()` callback',
    },
    messages: {
      nameAndCallback: 'Describe requires name and callback arguments',
      secondArgumentMustBeFunction: 'Second argument must be function',
      noAsyncDescribeCallback: 'No async describe callback',
      unexpectedDescribeArgument: 'Unexpected argument(s) in describe callback',
      unexpectedReturnInDescribe:
        'Unexpected return statement in describe callback',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const jestFnCall = parseJestFnCall(node, context);

        if (jestFnCall?.type !== 'describe') {
          return;
        }

        if (node.arguments.length < 1) {
          return context.report({
            messageId: 'nameAndCallback',
            loc: node.loc,
          });
        }

        const [, callback] = node.arguments;

        if (!callback) {
          context.report({
            messageId: 'nameAndCallback',
            loc: paramsLocation(node.arguments),
          });

          return;
        }

        if (!isFunction(callback)) {
          context.report({
            messageId: 'secondArgumentMustBeFunction',
            loc: paramsLocation(node.arguments),
          });

          return;
        }

        if (callback.async) {
          context.report({
            messageId: 'noAsyncDescribeCallback',
            node: callback,
          });
        }

        if (
          jestFnCall.members.every(s => getAccessorValue(s) !== 'each') &&
          callback.params.length
        ) {
          context.report({
            messageId: 'unexpectedDescribeArgument',
            loc: paramsLocation(callback.params),
          });
        }

        if (callback.body.type === AST_NODE_TYPES.CallExpression) {
          context.report({
            messageId: 'unexpectedReturnInDescribe',
            node: callback,
          });
        }

        if (callback.body.type === AST_NODE_TYPES.BlockStatement) {
          callback.body.body.forEach(node => {
            if (node.type === AST_NODE_TYPES.ReturnStatement) {
              context.report({
                messageId: 'unexpectedReturnInDescribe',
                node,
              });
            }
          });
        }
      },
    };
  },
});
