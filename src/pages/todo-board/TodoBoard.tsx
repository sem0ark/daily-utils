import { BoardStoreProvider } from "./board-store";
import { Board } from "./components/Board";

function BoardWithProvider() {
  // const storeName = useCurrentStore();
  return (
    <BoardStoreProvider storeName={""}>
      <Board />
    </BoardStoreProvider>
  );
}

export function KanbanBoard() {
  return (
    <div className="mx-auto h-full overflow-auto">
      <BoardWithProvider />
    </div>
  );
}
