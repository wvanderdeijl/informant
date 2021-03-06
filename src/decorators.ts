import { InspectOptions } from 'util';
import { Logger } from './logger';

/**
 * MethodDecorator to measure the amount of time a single method calls takes, does nothing if LogLevel.performance is not enabled on the
 * provided logger.
 *
 * @param logger the Logger that should be used for the logging
 */
export function measure(logger: Logger): MethodDecorator {
    return createDecorator('measure',
        (target, propertyKey, method) => logger.measureWrap(`${methodName(target, propertyKey)}`, method),
    );
}

/**
 * MethodDecorator that traces all calls to the method and logs both the entry and exit from the method, only if LogLevel.trace
 * is enabled for the given logger.
 *
 * @param logger the Logger that should be used for the logging
 * @param options optional options that should be passed to util.inspect when inspecting parameters to the method call
 */
export function trace(logger: Logger, options?: InspectOptions): MethodDecorator {
    return createDecorator('trace',
        (target, propertyKey, method) => logger.traceWrap(`${methodName(target, propertyKey)}`, method, options),
    );
}

/**
 * MethodDecorator that warns on the first call that the decorated method is deprecated.
 *
 * @param logger the Logger that should be used for the logging
 * @param instruction an optional instruction to include in the message
 */
export function deprecated(logger: Logger, instruction = ''): MethodDecorator {
    return createDecorator('deprecated',
        (target, propertyKey, method) => {
            let silenceUntil = -Infinity;
            return function deprecatedWrapper(this: any) {
                if (Date.now() >= silenceUntil) {
                    logger.warning(`${methodName(target, propertyKey)} is deprecated.`, instruction);
                    silenceUntil = Date.now() + 1000;
                }
                return method.apply(this, arguments);
            };
        });
}

type Func = (...args: any[]) => any;
function createDecorator(name: string, f: (target: any, propertyKey: string | symbol, method: Func) => Func): MethodDecorator {
    return <T>(target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => {
        if (!descriptor || typeof descriptor.value !== 'function') { throw new Error(`@${name}() can only be used on method.`); }
        descriptor.value = f(target, propertyKey, descriptor.value) as any;
    };
}

function methodName(target: any, propertyKey: string | symbol) {
    if (target.constructor === Function) {
        return `${target.name}.${propertyKey}`;
    }
    return `${target.constructor.name}#${propertyKey}`;
}
