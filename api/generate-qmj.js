export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST әдісі қажет"
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
Сен Қазақстан мектебінде жұмыс істейтін тәжірибелі педагог-әдіскерсің.

Қазақ тілінде толық қысқа мерзімді жоспар (ҚМЖ) құрастыр.

Пән: ${subject}
Сынып: ${grade}
Сабақ тақырыбы: ${topic}
Оқу мақсаты: ${learningObjective || "тақырыпқа сәйкес анықта"}

Сабақ ұзақтығы: 45 минут.

ҚМЖ нақты осы пәнге, сыныпқа, тақырыпқа және оқу мақсатына сәйкес болсын.

Міндетті түрде мыналар болсын:

1. Сабақ мақсаты.
2. Бағалау критерийлері.
3. Құндылықтар.
4. Сабақтың басы — 5 минут.
5. Сабақтың ортасы — 30 минут.
6. Сабақтың соңы — 10 минут.
7. Мұғалім әрекеті.
8. Оқушы әрекеті.
9. Нақты тақырыптық тапсырмалар.
10. Әр тапсырмаға дескриптор.
11. Қалыптастырушы бағалау.
12. Ресурстар.
13. Саралау:
   A деңгейі,
   B деңгейі,
   C деңгейі.
14. ЕБҚ оқушысына бейімделген тапсырма.
15. Рефлексия.

Жалпы сөздер жазба.
Тапсырмалар дәл "${topic}" тақырыбына қатысты болсын.

Тек JSON қайтар.

JSON құрылымы:

{
  "lessonGoal": "",
  "assessmentCriteria": [],
  "values": "",
  "beginning": {
    "time": "5 минут",
    "teacher": "",
    "student": "",
    "assessment": "",
    "resources": ""
  },
  "middle": {
    "time": "30 минут",
    "teacher": "",
    "student": "",
    "tasks": [
      {
        "title": "",
        "task": "",
        "descriptors": []
      }
    ],
    "assessment": "",
    "resources": ""
  },
  "end": {
    "time": "10 минут",
    "teacher": "",
    "student": "",
    "assessment": "",
    "resources": ""
  },
  "differentiation": {
    "A": "",
    "B": "",
    "C": ""
  },
  "inclusiveTask": "",
  "reflection": ""
}
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: "gpt-6-luna",
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      console.error(
        "OpenAI error:",
        data
      );

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "ЖИ сервисінде қате пайда болды."
      });
    }

    // Responses API нәтижесінен мәтінді алу
    let text = "";

    for (const item of data.output || []) {

      if (item.type !== "message") continue;

      for (const content of item.content || []) {

        if (
          content.type === "output_text" &&
          content.text
        ) {
          text += content.text;
        }
      }
    }

    if (!text) {
      throw new Error(
        "ЖИ жауап мәтінін қайтармады."
      );
    }

    // Кейде модель ```json ... ``` қайтарса тазалау
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    const qmj = JSON.parse(text);

    return res.status(200).json({
      success: true,
      qmj
    });

  } catch (error) {

    console.error(
      "generate-qmj error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "ҚМЖ құру кезінде қате пайда болды."
    });
  }
}
