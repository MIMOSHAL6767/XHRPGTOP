// 评论区存放在 GitHub Discussions，后台通过 GitHub GraphQL 读取与删除。
// 需要 GITHUB_TOKEN 具备讨论（discussions）读写权限。

export type GiscusComment = {
  id: string;
  body: string;
  author: string;
  avatarUrl: string | null;
  createdAt: string;
  discussionTitle: string;
  discussionUrl: string;
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

function getRepo() {
  const full = (process.env.NEXT_PUBLIC_GISCUS_REPO || "").trim();
  const [ownerFromRepo, nameFromRepo] = full.split("/");

  const owner =
    ownerFromRepo || (process.env.GITHUB_OWNER || "").trim();
  const name = nameFromRepo || "";

  return { owner, name };
}

function getToken() {
  return (
    process.env.GISCUS_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    ""
  ).trim();
}

export function isGiscusAdminConfigured() {
  const { owner, name } = getRepo();
  return Boolean(owner && name && getToken());
}

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error("未配置 GITHUB_TOKEN，无法管理 GitHub 评论");
  }

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "xhrpg-archive-admin",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const result = (await response.json()) as GraphqlResponse<T>;

  if (!response.ok || result.errors?.length) {
    const message =
      result.errors?.map((item) => item.message).join("；") ||
      `GitHub 接口返回 ${response.status}`;

    throw new Error(message);
  }

  if (!result.data) {
    throw new Error("GitHub 接口没有返回数据");
  }

  return result.data;
}

export async function listGiscusComments(): Promise<{
  comments: GiscusComment[];
  totalDiscussions: number;
}> {
  const { owner, name } = getRepo();

  if (!owner || !name) {
    throw new Error("未配置 NEXT_PUBLIC_GISCUS_REPO");
  }

  type Data = {
    repository: {
      discussions: {
        nodes: {
          id: string;
          title: string;
          url: string;
          comments: {
            nodes: {
              id: string;
              body: string;
              createdAt: string;
              author: { login: string; avatarUrl: string | null } | null;
            }[];
          };
        }[];
      };
    } | null;
  };

  const data = await graphql<Data>(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussions(first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes {
            id
            title
            url
            comments(first: 100) {
              nodes {
                id
                body
                createdAt
                author { login avatarUrl }
              }
            }
          }
        }
      }
    }`,
    { owner, name }
  );

  if (!data.repository) {
    throw new Error("找不到对应的 GitHub 仓库");
  }

  const comments = data.repository.discussions.nodes.flatMap(
    (discussion) =>
      discussion.comments.nodes.map((comment) => ({
        id: comment.id,
        body: comment.body,
        author: comment.author?.login || "ghost",
        avatarUrl: comment.author?.avatarUrl || null,
        createdAt: comment.createdAt,
        discussionTitle: discussion.title,
        discussionUrl: discussion.url,
      }))
  );

  comments.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    comments,
    totalDiscussions: data.repository.discussions.nodes.length,
  };
}

export async function deleteGiscusComment(commentId: string) {
  type Data = {
    deleteDiscussionComment: { clientMutationId: string | null } | null;
  };

  await graphql<Data>(
    `mutation($id: ID!) {
      deleteDiscussionComment(input: { id: $id }) {
        clientMutationId
      }
    }`,
    { id: commentId }
  );
}
