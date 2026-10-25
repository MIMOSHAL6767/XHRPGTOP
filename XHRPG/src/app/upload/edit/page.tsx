
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SubmissionEditEntryPage() {
  const router = useRouter();
  const [credential, setCredential] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = credential.trim();

    if (!/^[a-f0-9]{48}$/i.test(value)) {
      setError("请输入有效的 48 位投稿凭证。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/upload/edit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: value }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.id) {
        setError(result.message || "凭证验证失败，请检查后重试。");
        return;
      }

      sessionStorage.setItem(
        `xhrpg_submission_credential_${result.id}`,
        value
      );

      router.push(`/upload/edit/${result.id}`);
    } catch {
      setError("网络请求失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#10090b] px-4 py-12 text-[#f8eeee]">
      <div className="mx-auto w-full max-w-xl border border-[#4a2028] bg-[#160c0f] p-6 sm:p-8">
        <div className="mb-8 border-b border-[#4a2028] pb-5">
          <p className="mb-2 text-sm tracking-[0.2em] text-[#c77783]">
            XHRPG · SUBMISSION
          </p>
          <h1 className="text-2xl font-bold">编辑已有投稿</h1>
          <p className="mt-3 text-sm leading-7 text-[#c7b5b8]">
            输入提交游戏时获得的专属凭证，即可修改对应游戏的信息。
            无需填写游戏 ID。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="credential"
              className="mb-2 block text-sm font-medium"
            >
              投稿凭证
            </label>

            <textarea
              id="credential"
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              placeholder="粘贴提交游戏时获得的 48 位专属凭证"
              autoComplete="off"
              spellCheck={false}
              rows={3}
              maxLength={128}
              required
              className="w-full resize-y border border-[#4a2028] bg-[#10090b] p-3 text-sm text-white outline-none focus:border-[#a52a3a]"
            />

            <p className="mt-2 text-xs leading-6 text-[#9e858a]">
              凭证相当于编辑权限，请勿分享给其他人。
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="border border-[#8b1e2d] bg-[#2a1015] p-3 text-sm text-[#ffb8c1]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-[#a52a3a] bg-[#8b1e2d] px-4 py-3 font-semibold text-white transition hover:bg-[#a52a3a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "正在验证……" : "验证并进入编辑页面"}
          </button>
        </form>

        <div className="mt-6 border-t border-[#4a2028] pt-5 text-sm">
          <Link
            href="/upload"
            className="text-[#e8a2ac] hover:text-white"
          >
            ← 返回投稿页面
          </Link>
        </div>
      </div>
    </main>
  );
}
