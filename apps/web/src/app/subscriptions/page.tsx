"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiFetch } from "@/lib/api";
import type { Subscription, SubsStats } from "@lifeos/types";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SubscriptionFormModal } from "@/components/SubscriptionFormModal";
import { PageHeader } from "@/components/PageHeader";
import { PaymentCalendar } from "@/components/PaymentCalendar";

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubsStats | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [s, st] = await Promise.all([
      apiGet<Subscription[]>("/api/subscriptions"),
      apiGet<SubsStats>("/api/subscriptions/stats"),
    ]);
    if (s) setSubs(s);
    if (st) setStats(st);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(data: {
    name: string;
    category: string;
    cost: string;
    billingCycle: "monthly" | "yearly";
    nextPaymentAt: string;
    notes: string;
  }) {
    const body = {
      name: data.name,
      cost: Number(data.cost),
      category: data.category || undefined,
      currency: "RUB",
      billingCycle: data.billingCycle,
      nextPaymentAt: new Date(data.nextPaymentAt).toISOString(),
      notes: data.notes || undefined,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/subscriptions/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
    } catch { return; }

    setShowModal(false);
    setEditingId(null);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить подписку?")) return;
    try {
      await apiFetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      fetchData();
    } catch {}
  }

  function handleEdit(id: string) {
    setEditingId(id);
    setShowModal(true);
  }

  function handleAdd() {
    setEditingId(null);
    setShowModal(true);
  }

  const editingSub = editingId
    ? subs.find((s) => s.id === editingId)
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 bg-black p-4 sm:p-6">
      {/* Header */}
          <PageHeader
            title="Подписки"
            subtitle="Управление регулярными платежами"
            actions={
              <button
                onClick={handleAdd}
                className="btn-accent px-4 py-2"
              >
                + Добавить
              </button>
            }
          />

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Всего подписок" value={String(stats.total)} />
              <StatCard
                label="В месяц"
                value={`${stats.monthlyTotal.toLocaleString("ru-RU")} ₽`}
              />
              <StatCard
                label="В год"
                value={`${stats.yearlyTotal.toLocaleString("ru-RU")} ₽`}
              />
            </div>
          )}

          {/* Calendar */}
          <PaymentCalendar />

          {/* List */}
          <div className="flex flex-col gap-2">
            {subs.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                Нет подписок. Нажми «+ Добавить» чтобы создать первую.
              </p>
            )}
            {subs.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                {...sub}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Modal */}
          {showModal && (
            <SubscriptionFormModal
              onClose={() => {
                setShowModal(false);
                setEditingId(null);
              }}
              onSave={handleSave}
              initial={
                editingSub
                  ? {
                      name: editingSub.name,
                      category: editingSub.category ?? "",
                      cost: String(editingSub.cost),
                      billingCycle: editingSub.billingCycle as "monthly" | "yearly",
                      nextPaymentAt: editingSub.nextPaymentAt.split("T")[0],
                      notes: editingSub.notes ?? "",
                    }
                  : undefined
              }
            />
          )}
        </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold text-zinc-200">
        {value}
      </div>
    </div>
  );
}
