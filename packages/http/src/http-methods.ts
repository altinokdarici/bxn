export const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

export type HttpMethod = (typeof httpMethods)[number];

export function isHttpMethod(method: string): method is HttpMethod {
  return httpMethods.includes(method as HttpMethod);
}
