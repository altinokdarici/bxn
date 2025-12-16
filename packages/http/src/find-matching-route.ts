export interface RouteMatch {
  params: Record<string, string>;
  pattern: string;
}

/**
 * Converts a route pattern like "/users/:id" into a regex pattern
 * and extracts the parameter names
 */
function parseRoutePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];

  // Escape special regex characters except for :param
  let regexPattern = pattern
    .split('/')
    .map((segment) => {
      // Check if this segment is a parameter (starts with :)
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        paramNames.push(paramName);
        // Match any non-slash characters
        return '([^/]+)';
      }
      // Escape special regex characters in literal segments
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  // Ensure exact match (start to end)
  regexPattern = `^${regexPattern}$`;

  return {
    regex: new RegExp(regexPattern),
    paramNames,
  };
}

/**
 * Matches a pathname against a route pattern and extracts parameters
 * @param pattern - The route pattern (e.g., "/users/:id")
 * @param pathname - The actual pathname (e.g., "/users/123")
 * @returns RouteMatch if matched, null otherwise
 */
function matchRoute(pattern: string, pathname: string): RouteMatch | null {
  const { regex, paramNames } = parseRoutePattern(pattern);
  const match = pathname.match(regex);

  if (!match) {
    return null;
  }

  // Extract parameter values (match[0] is the full match, parameters start at index 1)
  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    const value = match[index + 1];
    if (value !== undefined) {
      params[name] = value;
    }
  });

  return {
    params,
    pattern,
  };
}

/**
 * Finds the first matching route pattern from a list of patterns
 * @param patterns - Array of route patterns
 * @param pathname - The actual pathname
 * @returns RouteMatch if a pattern matches, null otherwise
 */
export function findMatchingRoute(patterns: string[], pathname: string): RouteMatch | null {
  for (const pattern of patterns) {
    const match = matchRoute(pattern, pathname);
    if (match) {
      return match;
    }
  }
  return null;
}
