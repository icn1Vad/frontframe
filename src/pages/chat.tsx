import { appServices, definePageConfig, type AppPage } from "../app";
import { ChatScreen } from "../features/chat";

const Chat: AppPage = function Chat() {
  return <ChatScreen api={appServices.chat} />;
};

Chat.pageConfig = definePageConfig({ moduleId: "chat" });
export default Chat;
