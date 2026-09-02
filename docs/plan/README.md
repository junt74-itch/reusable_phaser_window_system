# Maintainer implementation plans

このディレクトリは、framework 開発時の作業分解・完了記録・初期構想を保存する保守者向けアーカイブです。

## Important

- ゲーム援用者向けの仕様書ではありません。
- 計画中の案、履歴上の制約、実装タスク名を public API として解釈しないでください。
- 現在の利用契約は [`../SPECIFICATION.md`](../SPECIFICATION.md) を優先します。
- class、option、error の利用方法は [`../API.md`](../API.md) を参照してください。
- 実装済み範囲の検証証跡は [`../MVP_RELEASE_CHECKLIST.md`](../MVP_RELEASE_CHECKLIST.md) と [`../PHASE2_RELEASE_CHECKLIST.md`](../PHASE2_RELEASE_CHECKLIST.md) を参照してください。

## Active plans

実装エージェントは次の文書だけを作業指示として使います。完了後は Archived へ移すか、チェックボックスを更新します。

- [TEXT_PADDING_AND_CHROMELESS_PLAN.md](TEXT_PADDING_AND_CHROMELESS_PLAN.md) — 文字 content padding の公開契約と下地 chrome なし
- [RICH_TEXT_PLAN.md](RICH_TEXT_PLAN.md) — リッチテキスト表示（font / size / align）

## Future backlog

未着手の将来機能です。実装済みの公開仕様として扱わないでください。

- [FUTURE_TODO.md](FUTURE_TODO.md) — リッチテキスト表示などの将来 TODO

## Archived plans

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Phase 1 WBS
- [PHASE1_CLOSEOUT_PLAN.md](PHASE1_CLOSEOUT_PLAN.md) — Phase 1 closeout
- [PHASE2_IMPLEMENTATION_PLAN.md](PHASE2_IMPLEMENTATION_PLAN.md) — Phase 2 WBS
- [reusable-phaser4-window-system_IMPLEMENTATION_PLAN.md](reusable-phaser4-window-system_IMPLEMENTATION_PLAN.md) — initial concept plan

これらの文書を変更するのは、履歴訂正または保守作業の証跡更新が必要な場合だけです。
