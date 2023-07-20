import { BabyAGI } from "langchain/experimental/babyagi";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { ChainTool, SerpAPI, Tool } from "langchain/tools";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {

    try {
        const { input } = await request.json();
        console.log('input', input);
        const serAPIKey = process.env.SERPAPI_API_KEY;
        //const llm = new OpenAI({ temperature: 0.7 });

        console.log(`serAPIKey: ${serAPIKey}`);
        // First, we create a custom agent which will serve as execution chain.
        const todoPrompt = PromptTemplate.fromTemplate(
            "You are a planner who is an expert at coming up with a todo list for a given objective. Come up with a todo list for this objective: {objective}"
        );
        const tools: Tool[] = [
            new SerpAPI(process.env.SERPAPI_API_KEY, {
                location: "San Francisco,California,United States",
                hl: "en",
                gl: "us",
            }),
            new ChainTool({
                name: "TODO",
                chain: new LLMChain({
                    llm: new OpenAI({ temperature: 0 }),
                    prompt: todoPrompt,
                }),
                description:
                    "useful for when you need to come up with todo lists. Input: an objective to create a todo list for. Output: a todo list for that objective. Please be very clear what the objective is!",
            }),
        ];

        console.log(`tools length: ${tools.length}`);

        const agentExecutor = await initializeAgentExecutorWithOptions(
            tools,
            new OpenAI({ temperature: 0 }),
            {
                agentType: "zero-shot-react-description",
                agentArgs: {
                    prefix: `You are an AI who performs one task based on the following objective: {objective}. Take into account these previously completed tasks: {context}.`,
                    suffix: `Question: {task}
  {agent_scratchpad}`,
                    inputVariables: ["objective", "task", "context", "agent_scratchpad"],
                },
            }
        );

        console.log(`agentExecutor: ${agentExecutor._chainType}`);

        const vectorStore = new MemoryVectorStore(new OpenAIEmbeddings());
        console.log(`vectorStore similarity`);

        // Then, we create a BabyAGI instance.
        const babyAGI = BabyAGI.fromLLM({
            llm: new OpenAI({ temperature: 0 }),
            executionChain: agentExecutor, // an agent executor is a chain
            vectorstore: vectorStore,
            verbose: true,
            maxIterations: 3,
        });

        const response = await babyAGI.call({ objective: "Write a short weather report for SF today" });

        console.log(`response: ${JSON.stringify(response)}`);

        return new NextResponse(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (e) {
        console.error(e);
        return new NextResponse(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}