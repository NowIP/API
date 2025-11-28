import { describeRoute, DescribeRouteOptions } from "hono-openapi";
import { type MiddlewareHandler } from "hono";
import { APIResponse } from "../../utils/api-res";
import { z } from "zod";
import { de } from "zod/v4/locales";
import { Utils } from "../../../utils";

export class APIRouteSpec {

    /**
     * @deprecated Use more specific methods like `authenticated` or `custom` instead.
     */
    static basic(spec: DescribeRouteOptions): MiddlewareHandler {
        return describeRoute(spec);
    }

    static custom(spec: DescribeRouteOptions): MiddlewareHandler {
        return describeRoute(spec);
    }

    static authenticated(spec: DescribeRouteOptions): MiddlewareHandler {
        return describeRoute({
            ...spec,
            security: [{
                bearerAuth: []
            }]
        });
    }

    static unauthenticated(spec: DescribeRouteOptions): MiddlewareHandler {
        return describeRoute({
            ...spec,
            security: []
        });
    }

}

export class APIResponseSpec {

    static describeBasic<T extends APIResponseSpec.Types.BasicDescription[]>(...responseSchemas: T) {
        return Utils.mergeObjects(...responseSchemas);
    }

    static describeWithWrongInputs<T extends APIResponseSpec.Types.BasicDescription[]>(...responseSchemas: T) {
        return Utils.mergeObjects(
            ...responseSchemas,
            APIResponseSpec.genericError(400, "Bad Request: Syntax or validation error in request"),
        );
    }

    static success<Data extends z.ZodType<APIResponse.Types.RequiredReturnData>>(description: string, dataSchema: Data) {
        return {
            200: {
                description,
                content: {
                    "application/json": {
                        vSchema: APIResponse.Schema.success(description, dataSchema)
                    },
                },
            }
        }
    }

    static created<Data extends z.ZodType<APIResponse.Types.RequiredReturnData>>(description: string, dataSchema: Data) {
        return {
            201: {
                description,
                content: {
                    "application/json": {
                        vSchema: APIResponse.Schema.created(description, dataSchema)
                    },
                },
            }
        }
    }

    static genericError<StatusCode extends APIResponseSpec.Types.HTTP_ERROR_CODES>(statusCode: StatusCode, description: string) {

        const settings = {
            description,
            content: {
                "application/json": {
                    vSchema: APIResponse.Utils.genericErrorSchema(description)
                },
            },
        };

        return {
            [statusCode as StatusCode]: settings
        } as {
            [K in StatusCode]: typeof settings
        }
    }

}

export namespace APIResponseSpec.Types {

    export type BasicDescription = {
        [statusCode: number]: {
            description: string;
            content: {
                "application/json": {
                    vSchema: z.ZodType<any>;
                }
            }
        }
    }

    export type HTTP_ERROR_CODES = 400 | 401 | 404 | 409 | 500;

}