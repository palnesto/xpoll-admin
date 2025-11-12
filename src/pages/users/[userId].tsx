import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useParams } from "react-router";

const SpecificUsersPage = () => {
  const { userId = "" } = useParams<{ userId: string }>();

  const { data: userData } = useApiQuery(endpoints.users.details(userId), {
    enabled: !!userId,
  });

  console.log("userData", userData);
  if (!userData) return <div>User not found</div>;
  return <div>UsersPage</div>;
};

export default SpecificUsersPage;
