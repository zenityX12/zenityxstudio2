import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";

interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  category: string;
}

const templates: PromptTemplate[] = [
  // Photography
  {
    id: "portrait-1",
    title: "Professional Portrait",
    prompt: "Professional headshot portrait, studio lighting, shallow depth of field, neutral background, high quality, 8k",
    category: "photography",
  },
  {
    id: "landscape-1",
    title: "Epic Landscape",
    prompt: "Breathtaking landscape photography, golden hour lighting, dramatic clouds, wide angle, ultra detailed, 8k",
    category: "photography",
  },
  {
    id: "product-1",
    title: "Product Photography",
    prompt: "Professional product photography, clean white background, soft studio lighting, commercial quality, high resolution",
    category: "photography",
  },
  
  // Art Styles
  {
    id: "anime-1",
    title: "Anime Style",
    prompt: "Anime art style, vibrant colors, detailed character design, studio quality, trending on pixiv",
    category: "art",
  },
  {
    id: "oil-painting-1",
    title: "Oil Painting",
    prompt: "Oil painting style, impressionist technique, rich colors, textured brushstrokes, museum quality",
    category: "art",
  },
  {
    id: "watercolor-1",
    title: "Watercolor",
    prompt: "Watercolor painting, soft colors, flowing textures, artistic, hand-painted style",
    category: "art",
  },
  
  // Concept Art
  {
    id: "scifi-1",
    title: "Sci-Fi Scene",
    prompt: "Futuristic sci-fi concept art, cyberpunk aesthetic, neon lights, detailed architecture, cinematic lighting",
    category: "concept",
  },
  {
    id: "fantasy-1",
    title: "Fantasy World",
    prompt: "Epic fantasy landscape, magical atmosphere, detailed environment, concept art, trending on artstation",
    category: "concept",
  },
  {
    id: "character-1",
    title: "Character Design",
    prompt: "Character concept art, full body, detailed costume design, professional illustration, game art style",
    category: "concept",
  },
  
  // Video Templates
  {
    id: "cinematic-1",
    title: "Cinematic Shot",
    prompt: "Cinematic camera movement, dramatic lighting, film grain, professional color grading, 4k quality",
    category: "video",
  },
  {
    id: "timelapse-1",
    title: "Time-lapse",
    prompt: "Time-lapse video, smooth motion, dynamic clouds, changing light, professional cinematography",
    category: "video",
  },
];

interface PromptTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
  type?: "image" | "video";
}

export function PromptTemplates({ onSelectTemplate, type = "image" }: PromptTemplatesProps) {
  const filteredTemplates = type === "video" 
    ? templates.filter(t => t.category === "video")
    : templates.filter(t => t.category !== "video");

  const categories = Array.from(new Set(filteredTemplates.map(t => t.category)));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prompt Templates</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates
                  .filter((t) => t.category === cat)
                  .map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors">
                      <CardHeader>
                        <CardTitle className="text-base">{template.title}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">
                          {template.prompt}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => onSelectTemplate(template.prompt)}
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

