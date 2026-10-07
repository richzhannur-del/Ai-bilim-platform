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
Сен Қазақстан мектебінің тәжірибелі педагогі және
саралап оқыту маманысың.

Оқушы БРАУЗЕРДЕ ТІКЕЛЕЙ ОРЫНДАЙ АЛАТЫН
интерактивті деңгейлік тапсырмалар құрастыр.

Пән: ${subject}
Сынып: ${grade}
Тақырып: ${topic}
Оқу мақсаты:
${learningObjective || "тақырыпқа сәйкес анықта"}

Тапсырмалар дәл осы тақырыпқа сәйкес болсын.

3 ДЕҢГЕЙ БОЛСЫН:

A — базалық деңгей
B — орта деңгей
C — жоғары деңгей

Барлығы 9 тапсырма жаса:
A деңгейі — 3 тапсырма
B деңгейі — 3 тапсырма
C деңгейі — 3 тапсырма.

Тапсырма түрлері:

1. choice
Оқушы берілген 4 нұсқаның біреуін таңдайды.

2. true_false
Оқушы "Дұрыс" немесе "Бұрыс" таңдайды.

3. short_answer
Оқушы қысқа жауап жазады.

Әр тапсырмада:
- бір нақты сұрақ;
- деңгей;
- тапсырма түрі;
- choice болса 4 жауап нұсқасы;
- дұрыс жауап;
- дескриптор;
- ұпай болуы керек.

Ұпай:
A деңгейі — әр тапсырма 1 ұпай.
B деңгейі — әр тапсырма 2 ұпай.
C деңгейі — әр тапсырма 3 ұпай.

МАҢЫЗДЫ:
- ${grade}-сыныптың жас ерекшелігін ескер.
- Сұрақтарды қайталама.
- Жалпы сөздер жазба.
- Тапсырмалар дәл "${topic}" тақырыбына қатысты болсын.
- Дұрыс жауап міндетті түрде берілсін.
- choice түрінде correctAnswer options ішіндегі
  жауаптың дәл өзімен бірдей болсын.
- true_false үшін correctAnswer тек
  "Дұрыс" немесе "Бұрыс" болсын.
- short_answer жауабы мүмкіндігінше қысқа әрі нақты болсын.
- Барлығы қазақ тілінде болсын.

ТЕК жарамды JSON қайтар.
Markdown қолданба.

JSON құрылымы:

{
  "title": "",
  "instruction": "",
  "subject": "",
  "grade": "",
  "topic": "",
  "learningObjective": "",
  "questions": [
    {
      "id": 1,
      "level": "A",
      "type": "choice",
      "question": "",
      "options": ["", "", "", ""],
      "correctAnswer": "",
      "descriptor": "",
      "points": 1
    }
  ]
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
                    // ҚМЖ генераторында жұмыс істеп тұрған
                    // модель атауы сақталды
                    model: "gpt-6-luna",
                    input: prompt
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI level task error:", data);

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "ЖИ тапсырма жасау кезінде қате жіберді."
            });
        }

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
                "ЖИ тапсырма мазмұнын қайтармады."
            );
        }

        text = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        let activity;

        try {
            activity = JSON.parse(text);
        } catch (error) {
            console.error("Task JSON parse error:", text);

            throw new Error(
                "ЖИ тапсырмасының деректерін оқу мүмкін болмады."
            );
        }

        if (
            !Array.isArray(activity.questions) ||
            activity.questions.length !== 9
        ) {
            throw new Error(
                "ЖИ 9 тапсырманы толық құрмады. Қайта жасап көріңіз."
            );
        }

        // Қауіпсіздік үшін ұпайды сервер өзі бекітеді
        activity.questions =
            activity.questions.map((q, index) => {

                let level;

                if (index < 3) level = "A";
                else if (index < 6) level = "B";
                else level = "C";

                const points =
                    level === "A" ? 1 :
                    level === "B" ? 2 : 3;

                return {
                    id: index + 1,
                    level,
                    type: q.type || "choice",
                    question: q.question || "",
                    options:
                        Array.isArray(q.options)
                            ? q.options
                            : [],
                    correctAnswer:
                        q.correctAnswer || "",
                    descriptor:
                        q.descriptor || "",
                    points
                };
            });

        return res.status(200).json({
            success: true,
            activity
        });

    } catch (error) {

        console.error(
            "generate-level-task error:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Деңгейлік тапсырма жасау кезінде қате пайда болды."
        });
    }
}
