import { definePageConfig, type AppPage } from "../app";
import { ChatScreen } from "../features/chat";

const Chat: AppPage = function Chat() {
  return <ChatScreen />;
};

Chat.pageConfig = definePageConfig({ moduleId: "chat" });
export default Chat;
