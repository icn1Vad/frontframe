import {
  definePageConfig,
  getRuntimeAppServices,
  type AppPage,
} from "../app";
import { ChatScreen } from "../features/chat";

const Chat: AppPage = function Chat() {
  return <ChatScreen api={getRuntimeAppServices().chat} />;
};

Chat.pageConfig = definePageConfig({ moduleId: "chat" });
export default Chat;
