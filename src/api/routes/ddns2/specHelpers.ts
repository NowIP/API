import { describeRoute, DescribeRouteOptions } from "hono-openapi";
import { type MiddlewareHandler } from "hono";

export class APIRouteSpec {

    static basic(spec: DescribeRouteOptions): MiddlewareHandler {
        return describeRoute(spec);
    }

}
