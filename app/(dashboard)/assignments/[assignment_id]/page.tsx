async function TaskContent({ params }: { params: Promise<{ task_id: string }> }) {
  const { task_id } = await params;
  return (
    <div>
      <h1>taskページ</h1>
      <p>ID: {task_id}</p>
    </div>
  );
}

export default function TaskDetail({ params }: { params: Promise<{ task_id: string }> }) {
  return <TaskContent params={params} />;
}