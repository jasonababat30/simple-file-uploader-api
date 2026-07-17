export interface ErrorWithStatusCode extends Error {
    statusCode?: number;
}
