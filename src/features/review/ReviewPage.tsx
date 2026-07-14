import { useNavigate, useParams } from "react-router-dom";
import { ReviewWorkbench } from "./ReviewWorkbench";

export function ReviewPage() {
  const { screenId } = useParams<{ screenId: string }>();
  const navigate = useNavigate();

  return (
    <ReviewWorkbench
      {...(screenId !== undefined ? { screenId } : {})}
      navigate={(path) => {
        navigate(path);
      }}
    />
  );
}
