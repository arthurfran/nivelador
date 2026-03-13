import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CaixaDagua from "./components/CaixaDagua";
import { database, ref, onValue, set } from "./firebase";

const initialStatus = {
  nivelPercentual: 0,
  bombaLigada: false,
  chave: "remoto",
  operacao: "automatico",
  permiteComandoApp: true,
  tempoRestanteSegundos: 0,
  ultimaAtualizacao: "--:--:--",
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

export default function App() {
  const [status, setStatus] = useState(initialStatus);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    const statusRef = ref(database, "nivelBomba");

    const unsubscribe = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      setStatus({
        nivelPercentual: data.nivelPercentual ?? 0,
        bombaLigada: data.bombaLigada ?? false,
        chave: data.chave ?? "remoto",
        operacao: data.operacao ?? "automatico",
        permiteComandoApp: data.permiteComandoApp ?? true,
        tempoRestanteSegundos: data.tempoRestanteSegundos ?? 0,
        ultimaAtualizacao: data.ultimaAtualizacao ?? "--:--:--",
      });
    });

    return () => unsubscribe();
  }, []);

  async function enviarComando(acao) {
    if (!status.permiteComandoApp) return;

    setLoadingAction(true);

    try {
      await set(ref(database, "comandos/override"), {
        acao,
        duracao: acao === "cancel" ? 0 : 120,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.log("Erro ao enviar comando:", error);
    } finally {
      setLoadingAction(false);
    }
  }

  const barraNivelWidth = `${status.nivelPercentual}%`;
  const botoesDesabilitados = !status.permiteComandoApp || loadingAction;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      >
        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 20,
            padding: 20,
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#1f2937",
            alignItems: "center",
          }}
        >
          <CaixaDagua nivel={status.nivelPercentual} size={220} />

          <Text
            style={{
              color: "#ffffff",
              fontSize: 30,
              fontWeight: "700",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {status.nivelPercentual.toFixed(0)}%
          </Text>

          <View
            style={{
              height: 16,
              width: "100%",
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

          <Text
            style={{
              color: "#94a3b8",
              marginTop: 12,
              textAlign: "center",
            }}
          >
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
            disabled={botoesDesabilitados}
            style={{
              backgroundColor: botoesDesabilitados ? "#374151" : "#2563eb",
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
            Firebase
          </Text>

          <Text style={{ color: "#94a3b8" }}>
            Última atualização: {status.ultimaAtualizacao}
          </Text>

          <Text style={{ color: "#94a3b8" }}>
            Fonte de dados: Firebase Realtime Database
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
