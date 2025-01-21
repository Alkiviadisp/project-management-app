import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/login-form";

export default function Home() {
  return (
    <div>
      <Button>Click me</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      
    </div>
  );
}


