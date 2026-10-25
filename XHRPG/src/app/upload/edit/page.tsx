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
    <main className="min-h-screen bg-[#10090b] px-4 py-10 text-[#f8eeee] sm:py-16">
      <div className="mx-auto flex min-h-[75vh] w-full max-w-5xl flex-col justify-center">
        <div className="mb-8">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 text-sm text-[#c9a6ac] transition hover:text-white"
          >
            <span aria-hidden="true">←</span>
            返回投稿中心
          </Link>
        </div>

        <div className="grid overflow-hidden border border-[#4a2028] bg-[#160c0f] md:grid-cols-[0.85fr_1.15fr]">
          <aside className="relative flex min-h-[220px] flex-col justify-between overflow-hidden border-b border-[#4a2028] bg-[#200d12] p-6 sm:p-9 md:border-b-0 md:border-r">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 border border-[#5a202c]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 border border-[#8b1e2d]"
            />

            <div className="relative">
              <p className="text-xs tracking-[0.24em] text-[#d17c89]">
                XHRPG · SUBMISSION
              </p>

              <div className="mt-8 flex h-14 w-14 items-center justify-center border border-[#a52a3a] text-3xl text-[#e5484d]">
                ✎
              </div>

              <h1 className="mt-5 text-2xl font-bold leading-tight sm:text-3xl">
                编辑已有投稿
              </h1>

              <p className="mt-4 max-w-sm text-sm leading-7 text-[#c7b5b8]">
                使用提交游戏时获得的专属凭证，找回对应投稿并继续完善资料。
              </p>
            </div>

            <div className="relative mt-8 border-t border-[#4a2028] pt-4">
              <p className="text-xs leading-6 text-[#a88c91]">
                请妥善保管投稿凭证。任何获得凭证的人，都可能尝试访问对应的编辑入口。
              </p>
            </div>
          </aside>

          <section className="p-5 sm:p-9">
            <div className="mb-7">
              <p className="text-xs tracking-[0.16em] text-[#c77783]">
                VERIFY YOUR CREDENTIAL
              </p>
              <h2 className="mt-2 text-xl font-bold">
                验证投稿凭证
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#bba9ac]">
                无需填写游戏 ID。验证成功后，系统会自动定位你的投稿。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="credential"
                  className="mb-2 block text-sm font-semibold text-[#f0dfe2]"
                >
                  48 位专属凭证
                </label>

                <textarea
                  id="credential"
                  value={credential}
                  onChange={(event) => {
                    setCredential(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="请粘贴你的投稿凭证"
                  autoComplete="off"
                  spellCheck={false}
                  rows={4}
                  maxLength={128}
                  required
                  className="w-full resize-y border border-[#59303a] bg-[#10090b] p-4 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-[#71575c] focus:border-[#e5484d] focus:ring-1 focus:ring-[#8b1e2d]"
                />

                <div className="mt-2 flex items-start justify-between gap-3 text-xs leading-5 text-[#9e858a]">
                  <span>请完整粘贴凭证，不要添加其他文字。</span>
                  <span className="shrink-0">
                    {credential.trim().length}/48
                  </span>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="border-l-2 border-[#e5484d] bg-[#2a1015] p-3 text-sm leading-6 text-[#ffb8c1]"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 border border-[#b72e40] bg-[#8b1e2d] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#a52a3a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="inline-block h-4 w-4 animate-spin border-2 border-white/40 border-t-white"
                    />
                    正在验证凭证……
                  </>
                ) : (
                  <>
                    验证并进入编辑页面
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 border-t border-[#4a2028] pt-5">
              <p className="text-xs leading-6 text-[#9e858a]">
                如果无法验证，请检查凭证是否完整，以及是否使用了正确的投稿凭证。
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-5 text-center text-xs text-[#755d62]">
          XHRPG · 喜灰 RPG 资源站
        </footer>
      </div>
    </main>
  );
}
