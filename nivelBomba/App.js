import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CaixaDagua from "./components/CaixaDagua";

const MOCK_DELAY = 500;
const API_BASE_URL = "http://192.168.0.10:80";

const initialStatus = {
  nivelPercentual: 15,
  bombaLigada: true,
  chave: "remoto", // local | remoto
  operacao: "automatico", // automatico | override_on | override_off
  permiteComandoApp: true,
  tempoRestanteSegundos: 0,
  ultimaAtualizacao: new Date().toLocaleTimeString("pt-BR"),
};

function formatarTempo(segundos) {
  const mins = Math.floor(segundos / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(segundos % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

function labelOperacao(operacao) {
  switch (operacao) {
    case "override_on":
      return "Ligamento forçado";
    case "override_off":
      return "Desligamento forçado";
    default:
      return "Automática";
  }
}

function corNivel(nivel) {
  if (nivel <= 20) return "#ef4444";
  if (nivel >= 95) return "#22c55e";
  return "#38bdf8";
}

async function mockFetchStatus(current) {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

  const variacao = Math.random() > 0.5 ? 1 : -1;
  const novoNivel = Math.min(
    100,
    Math.max(0, current.nivelPercentual + variacao * 2),
  );

  const proximo = {
    ...current,
    nivelPercentual: novoNivel,
    ultimaAtualizacao: new Date().toLocaleTimeString("pt-BR"),
  };

  if (proximo.operacao === "automatico") {
    if (novoNivel <= 20) proximo.bombaLigada = true;
    else if (novoNivel >= 95) proximo.bombaLigada = false;
  }

  return proximo;
}

export default function App() {
  const [status, setStatus] = useState(initialStatus);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [usarMock, setUsarMock] = useState(true);

  const barraNivelWidth = useMemo(
    () => `${status.nivelPercentual}%`,
    [status.nivelPercentual],
  );

  const carregarStatus = useCallback(async () => {
    setRefreshing(true);

    try {
      if (usarMock) {
        const next = await mockFetchStatus(status);
        setStatus(next);
      } else {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();

        setStatus({
          nivelPercentual: data.nivelPercentual,
          bombaLigada: data.bombaLigada,
          chave: data.chave,
          operacao: data.operacao,
          permiteComandoApp: data.permiteComandoApp,
          tempoRestanteSegundos: data.tempoRestanteSegundos,
          ultimaAtualizacao: new Date().toLocaleTimeString("pt-BR"),
        });
      }
    } catch (error) {
      console.log("Erro ao carregar status:", error);
    } finally {
      setRefreshing(false);
    }
  }, [status, usarMock]);

  const enviarComando = useCallback(
    async (acao) => {
      if (!status.permiteComandoApp) return;

      setLoadingAction(true);

      try {
        if (usarMock) {
          await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

          if (acao === "on") {
            setStatus((prev) => ({
              ...prev,
              bombaLigada: true,
              operacao: "override_on",
              tempoRestanteSegundos: 120,
              ultimaAtualizacao: new Date().toLocaleTimeString("pt-BR"),
            }));
          }

          if (acao === "off") {
            setStatus((prev) => ({
              ...prev,
              bombaLigada: false,
              operacao: "override_off",
              tempoRestanteSegundos: 120,
              ultimaAtualizacao: new Date().toLocaleTimeString("pt-BR"),
            }));
          }

          if (acao === "cancel") {
            setStatus((prev) => ({
              ...prev,
              operacao: "automatico",
              tempoRestanteSegundos: 0,
              ultimaAtualizacao: new Date().toLocaleTimeString("pt-BR"),
            }));
          }
        } else {
          const endpoint =
            acao === "on"
              ? "/override/on"
              : acao === "off"
                ? "/override/off"
                : "/override/cancel";

          await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body:
              acao === "cancel" ? undefined : JSON.stringify({ duracao: 120 }),
          });

          await carregarStatus();
        }
      } catch (error) {
        console.log("Erro ao enviar comando:", error);
      } finally {
        setLoadingAction(false);
      }
    },
    [carregarStatus, status.permiteComandoApp, usarMock],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setStatus((prev) => {
        if (prev.tempoRestanteSegundos <= 0) return prev;

        const restante = prev.tempoRestanteSegundos - 1;

        if (restante <= 0) {
          let bombaLigada = prev.bombaLigada;

          if (prev.nivelPercentual <= 20) bombaLigada = true;
          else if (prev.nivelPercentual >= 95) bombaLigada = false;

          return {
            ...prev,
            bombaLigada,
            operacao: "automatico",
            tempoRestanteSegundos: 0,
            ultimaAtualizacao: new Date().toLocaleTimeString("pt-BR"),
          };
        }

        return {
          ...prev,
          tempoRestanteSegundos: restante,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const poll = setInterval(() => {
      carregarStatus();
    }, 5000);

    return () => clearInterval(poll);
  }, [carregarStatus]);

  const botoesDesabilitados = !status.permiteComandoApp || loadingAction;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={carregarStatus}
            tintColor="#ffffff"
          />
        }
      >
        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 20,
            padding: 20,
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#1f2937",
          }}
        >
          <CaixaDagua nivel={status.nivelPercentual} size={220} />

          <Text style={{ color: "#ffffff", fontSize: 30, fontWeight: "700" }}>
            {status.nivelPercentual.toFixed(0)}%
          </Text>

          <View
            style={{
              height: 16,
              backgroundColor: "#1f2937",
              borderRadius: 999,
              overflow: "hidden",
              marginTop: 14,
            }}
          >
            <View
              style={{
                width: barraNivelWidth,
                height: "100%",
                backgroundColor: corNivel(status.nivelPercentual),
                borderRadius: 999,
              }}
            />
          </View>

          <Text style={{ color: "#94a3b8", marginTop: 12 }}>
            Liga em 20% • Desliga em 95% • Entre esses valores mantém o último
            estado.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#111827",
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: "#1f2937",
            }}
          >
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>Bomba</Text>
            <Text
              style={{
                color: status.bombaLigada ? "#22c55e" : "#ef4444",
                fontSize: 22,
                fontWeight: "700",
                marginTop: 8,
              }}
            >
              {status.bombaLigada ? "Ligada" : "Desligada"}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "#111827",
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: "#1f2937",
            }}
          >
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>
              Chave seletora
            </Text>
            <Text
              style={{
                color: "#ffffff",
                fontSize: 22,
                fontWeight: "700",
                marginTop: 8,
                textTransform: "capitalize",
              }}
            >
              {status.chave}
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: "#1f2937",
            gap: 10,
          }}
        >
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>Operação atual</Text>
          <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700" }}>
            {labelOperacao(status.operacao)}
          </Text>

          {status.tempoRestanteSegundos > 0 && (
            <Text style={{ color: "#fbbf24", fontSize: 15 }}>
              Tempo restante do override:{" "}
              {formatarTempo(status.tempoRestanteSegundos)}
            </Text>
          )}

          <Text
            style={{ color: status.permiteComandoApp ? "#22c55e" : "#ef4444" }}
          >
            {status.permiteComandoApp
              ? "Comando pelo app liberado"
              : "Comando pelo app bloqueado pela chave local"}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: "#1f2937",
            gap: 12,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
            Comandos
          </Text>

          <TouchableOpacity
            onPress={() => enviarComando("on")}
            disabled={botoesDesabilitados}
            style={{
              backgroundColor: botoesDesabilitados ? "#374151" : "#16a34a",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
              Ligar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => enviarComando("off")}
            disabled={botoesDesabilitados}
            style={{
              backgroundColor: botoesDesabilitados ? "#374151" : "#dc2626",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
              Desligar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => enviarComando("cancel")}
            disabled={botoesDesabilitados || status.tempoRestanteSegundos <= 0}
            style={{
              backgroundColor:
                botoesDesabilitados || status.tempoRestanteSegundos <= 0
                  ? "#374151"
                  : "#2563eb",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
              Cancelar override
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: "#1f2937",
            gap: 12,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
            Ambiente
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text
                style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}
              >
                Usar dados mockados
              </Text>
              <Text style={{ color: "#94a3b8", marginTop: 4 }}>
                Mantenha ligado enquanto o ESP32 ainda não estiver disponível.
              </Text>
            </View>

            <Switch value={usarMock} onValueChange={setUsarMock} />
          </View>

          <Text style={{ color: "#94a3b8" }}>
            Última atualização: {status.ultimaAtualizacao}
          </Text>

          {!usarMock && (
            <Text style={{ color: "#94a3b8" }}>
              Base da API: {API_BASE_URL}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
