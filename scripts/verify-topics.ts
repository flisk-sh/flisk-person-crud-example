interface TopicsResponse {
  names: string[];
}

const FALLBACK_REPOSITORY = 'flisk-sh/flisk-person-crud-example';
const MINIMUM_TOPIC_COUNT = 5;
const MANDATORY_TOPICS = ['example', 'local-development'];

async function verifyTopics(): Promise<void> {
  const repository = process.env.GITHUB_REPOSITORY?.trim() || FALLBACK_REPOSITORY;
  const token = process.env.GITHUB_TOKEN?.trim();

  console.log(`Checking repository topics for: ${repository}`);

  const parts = repository.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    console.error(`Error: Invalid repository format "${repository}". Expected "owner/repo".`);
    process.exit(1);
  }

  const [owner, repo] = parts;
  const apiBaseUrl = process.env.GITHUB_API_URL?.trim() || 'https://api.github.com';
  const url = `${apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/topics`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'topic-verifier/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    console.error(`Network error: Failed to reach GitHub API (${url}):`, error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errorJson = (await response.json()) as { message?: string };
      errorDetails = errorJson?.message ? `: ${errorJson.message}` : '';
    } catch {
      // Body may not be JSON
    }

    if (response.status === 404) {
      console.error(`HTTP 404 Not Found: Repository "${repository}" does not exist or is private.`);
    } else if (response.status === 403) {
      console.error(`HTTP 403 Forbidden: API rate limit exceeded or insufficient permissions${errorDetails}.`);
      if (!token) {
        console.error('Tip: Set the GITHUB_TOKEN environment variable to avoid unauthenticated API rate limits.');
      }
    } else {
      console.error(`HTTP ${response.status} ${response.statusText}${errorDetails}`);
    }
    process.exit(1);
  }

  let data: TopicsResponse;
  try {
    data = (await response.json()) as TopicsResponse;
  } catch (error) {
    console.error('Error: Failed to parse GitHub API response as JSON:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (!data || !Array.isArray(data.names)) {
    console.error('Error: Unexpected GitHub API response format. "names" array missing:', data);
    process.exit(1);
  }

  const existingTopics = data.names;
  console.log(`\nFound ${existingTopics.length} topic(s):`);
  if (existingTopics.length > 0) {
    console.log(existingTopics.map((topic) => `  - ${topic}`).join('\n'));
  } else {
    console.log('  (None)');
  }

  const missingMandatory = MANDATORY_TOPICS.filter((topic) => !existingTopics.includes(topic));
  const hasMinimumCount = existingTopics.length >= MINIMUM_TOPIC_COUNT;
  const hasMandatoryTopics = missingMandatory.length === 0;

  console.log('\nValidation Results:');
  console.log(`- Minimum topic count (>= ${MINIMUM_TOPIC_COUNT}): ${hasMinimumCount ? 'PASS' : `FAIL (${existingTopics.length}/${MINIMUM_TOPIC_COUNT})`}`);
  console.log(`- Mandatory topics present: ${hasMandatoryTopics ? 'PASS' : 'FAIL'}`);

  if (missingMandatory.length > 0) {
    console.log(`  Missing mandatory topic(s): ${missingMandatory.map((t) => `"${t}"`).join(', ')}`);
  }

  if (hasMinimumCount && hasMandatoryTopics) {
    console.log('\nSUCCESS: Repository topics verification passed successfully.');
    process.exit(0);
  } else {
    console.error('\nFAILURE: Repository topics verification failed.');
    if (!hasMinimumCount) {
      console.error(`- Needs at least ${MINIMUM_TOPIC_COUNT} topics, but found only ${existingTopics.length}.`);
    }
    if (!hasMandatoryTopics) {
      console.error(`- Must include mandatory topics: ${missingMandatory.map((t) => `"${t}"`).join(', ')}.`);
    }
    process.exit(1);
  }
}

verifyTopics().catch((error) => {
  console.error('Unexpected fatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
