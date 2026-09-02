# Documentation index

目的別の入口です。仕様判断が競合する場合は、次の順序を優先します。

1. [SPECIFICATION.md](SPECIFICATION.md) — 現行の規範仕様と互換性境界
2. [API.md](API.md) — 公開 API と利用例
3. [adr/](adr/) — 個別設計判断と Phaser 4 API の検証結果
4. release checklist — 実装・ブラウザ検証の証跡

## Start here

| Need | Document |
|---|---|
| Git submodule として導入する | [SUBMODULE.md](SUBMODULE.md) |
| 現行仕様と保証範囲を知る | [SPECIFICATION.md](SPECIFICATION.md) |
| class / option / error を調べる | [API.md](API.md) |
| ソースの責務を辿る | [../src/README.md](../src/README.md) |
| 描画・scroll・focus の設計理由を知る | [adr/](adr/) |
| Phase 1 の検証証跡を見る | [MVP_RELEASE_CHECKLIST.md](MVP_RELEASE_CHECKLIST.md) |
| Phase 2 の検証証跡を見る | [PHASE2_RELEASE_CHECKLIST.md](PHASE2_RELEASE_CHECKLIST.md) |

実装計画は援用者向け仕様と混同しないよう、保守者用の [`plan/`](plan/README.md) に隔離しています。通常のゲーム実装では参照不要です。
