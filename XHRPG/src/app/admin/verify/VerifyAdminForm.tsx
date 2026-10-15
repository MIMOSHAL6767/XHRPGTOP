
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type VerifyQuestion = {
  id: number;
  question: string;
  answer: string;
  enabled: boolean;
};

export default function VerifyAdminForm() {
  const router = useRouter();

  const [list, setList] = useState<VerifyQuestion[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");

      const res = await fetch("/api/admin/verify", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "加载验证题失败");
      }

      setList(Array.isArray(data.questions) ? data.questions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败，请稍后重试");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!question.trim() || !answer.trim()) {
      alert("问题和答案不能为空");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          answer: answer.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "添加失败");
      }

      setQuestion("");
      setAnswer("");
      alert("添加成功");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "添加失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    if (busyId !== null) return;

    if (!confirm("确定删除这个验证题吗？此操作无法撤销。")) {
      return;
    }

    setBusyId(id);

    try {
      const res = await fetch(
        `/api/admin/verify?id=${encodeURIComponent(String(id))}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "删除失败");
      }

      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败，请稍后重试");
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(item: VerifyQuestion) {
    if (busyId !== null) return;

    setBusyId(item.id);

    try {
      const res = await fetch("/api/admin/verify", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          enabled: !item.enabled,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "切换状态失败");
      }

      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失败，请稍后重试");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-box">
        <button type="button" onClick={() => router.back()}>
          ← 返回
        </button>

        <h1>注册验证题库管理</h1>

        {error && <p role="alert">{error}</p>}

        <h2>添加验证问题</h2>

        <div className="form-grid">
          <label>
            问题
            <input
              value={question}
              maxLength={500}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>

          <label>
            答案
            <input
              value={answer}
              maxLength={500}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </label>
        </div>

        <button type="button" onClick={() => void add()} disabled={loading}>
          {loading ? "正在添加..." : "添加问题"}
        </button>

        <hr />

        <h2>已有验证问题</h2>

        {list.length === 0 ? (
          <p>暂无验证问题</p>
        ) : (
          list.map((item) => (
            <div key={item.id} className="verify-item">
              <h3>{item.question}</h3>

              <p>答案：{item.answer}</p>

              <p>状态：{item.enabled ? "启用" : "关闭"}</p>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void toggle(item)}
              >
                {item.enabled ? "关闭问题" : "启用问题"}
              </button>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void remove(item.id)}
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
