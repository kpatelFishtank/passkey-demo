/**
 * Locate the difference between a look-alike hostname and the real one.
 *
 * A typosquatted domain differs by a character or two buried in the middle of a
 * string nobody reads carefully -- which is exactly the point of the phishing
 * demo. Finding the divergence lets the UI show the audience precisely what
 * they failed to spot.
 *
 * Common prefix and common suffix are enough here. It handles the cases that
 * matter -- a dropped letter, a doubled letter, a substitution, a transposition
 * -- without needing a real diff algorithm.
 */
export type HostDiff = {
  prefix: string;
  /** The part of the string unique to it. Empty when a character was dropped. */
  middle: string;
  suffix: string;
};

export function diffHosts(
  actual: string,
  expected: string,
): { actual: HostDiff; expected: HostDiff; identical: boolean } {
  if (actual === expected) {
    return {
      actual: { prefix: actual, middle: "", suffix: "" },
      expected: { prefix: expected, middle: "", suffix: "" },
      identical: true,
    };
  }

  let head = 0;
  while (
    head < actual.length &&
    head < expected.length &&
    actual[head] === expected[head]
  ) {
    head += 1;
  }

  let tail = 0;
  while (
    tail < actual.length - head &&
    tail < expected.length - head &&
    actual[actual.length - 1 - tail] === expected[expected.length - 1 - tail]
  ) {
    tail += 1;
  }

  return {
    actual: {
      prefix: actual.slice(0, head),
      middle: actual.slice(head, actual.length - tail),
      suffix: actual.slice(actual.length - tail),
    },
    expected: {
      prefix: expected.slice(0, head),
      middle: expected.slice(head, expected.length - tail),
      suffix: expected.slice(expected.length - tail),
    },
    identical: false,
  };
}
