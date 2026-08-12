import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatState {
  messagesByWorker: Record<string, ChatMessage[]>;
}

const initialState: ChatState = {
  messagesByWorker: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (
      state,
      action: PayloadAction<{ workerId: string; message: ChatMessage }>
    ) => {
      const { workerId, message } = action.payload;
      if (!state.messagesByWorker[workerId]) {
        state.messagesByWorker[workerId] = [];
      }
      state.messagesByWorker[workerId].push(message);
    },
    clearMessages: (state, action: PayloadAction<{ workerId: string }>) => {
      const { workerId } = action.payload;
      state.messagesByWorker[workerId] = [];
    },
  },
});

export const { addMessage, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;
