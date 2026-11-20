
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST әдісі қажет."
    });
  }

  try {
    const {
      subject,
      grade,
      topic,
      learningObjective
    } = req.body || {};

    if (!subject || !grade || !topic) {
      return res.status(400).json({
        error: "Пән, сынып және тақырып міндетті."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY орнатылмаған."
      });
    }

    const prompt = `
Сен қазақ тіліндегі білім беру комикстерінің авторысың.

Пән: ${subject}
Сынып: ${grade}
Тақырып: ${topic}
Оқу мақсаты: ${learningObjective || "Тақырыпқа сәйкес"}

Оқушыларға арналған қызықты, танымдық
6 кадрлық комикс сценарийін жаса.

ТАЛАПТАР:
- Барлығы 6 кадр болсын.
- Қазақ тілінде жаз.
- Кейіпкерлер барлық кадрда бірізді болсын.
- Диалогтар қысқа және түсінікті болсын.
- Әр кадрда оқиға дамысын.
- Соңғы кадрда қорытынды жасалсын.
- Әр кадрға сурет генерациясына арналған
  нақты ағылшын тіліндегі imagePrompt жаз.
- Жас ерекшелігіне сай болсын.
- Ғылыми және оқу мазмұны дұрыс болсын.

Тек JSON объектісін қайтар.

Құрылымы:
{
  "title": "Комикс атауы",
  "subject": "Пән",
  "grade": "Сынып",
  "topic": "Тақырып",
  "characters": [
    {
      "name": "Кейіпкер есімі",
      "description": "Сыртқы келбеті"
    }
  ],
  "frames": [
    {
      "number": 1,
      "scene": "Оқиға сипаттамасы",
      "dialogue": [
        {
          "speaker": "Кейіпкер",
          "text": "Диалог"
        }
      ],
      "imagePrompt": "English visual description"
    }
  ],
  "conclusion": "Оқу қорытындысы"
}
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: prompt,
          text: {
            format: {
              type: "json_object"
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message ||
        "OpenAI сұрауында қате пайда болды."
      );
    }

    let text = "";

    for (const item of data.output || []) {
      if (item.type !== "message") continue;

      for (const content of item.content || []) {
        if (content.type === "output_text") {
          text += content.text;
        }
      }
    }

    if (!text) {
      throw new Error("ЖИ жауап қайтармады.");
    }

    const comic = JSON.parse(text);

    if (
      !Array.isArray(comic.frames) ||
      comic.frames.length !== 6
    ) {
      throw new Error(
        "Комиксте дәл 6 кадр болуы керек."
      );
    }

    return res.status(200).json({
      success: true,
      comic
    });

  } catch (error) {
    console.error("Comic generation error:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Комикс жасау кезінде қате пайда болды."
    });
  }
}
