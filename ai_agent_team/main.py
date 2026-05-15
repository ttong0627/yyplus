import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from crewai import Crew, Process
from agents import create_agents
from tasks import create_tasks

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY", "")
if not api_key:
    api_key = input("Google Gemini API 키를 입력해주세요: ")
    os.environ["GOOGLE_API_KEY"] = api_key

def run_agent_team(existing_program_desc):
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.7)
    agents_dict = create_agents(llm)
    agents_list = list(agents_dict.values())
    tasks_list = create_tasks(agents_dict, existing_program_desc)

    crew = Crew(
        agents=agents_list,
        tasks=tasks_list,
        process=Process.sequential, 
        verbose=True
    )

    print("\n🚀 [AI 에이전트 10인 완전체 팀] 작업을 시작합니다...")
    return crew.kickoff()

if __name__ == "__main__":
    print("=========================================================")
    print(" 🤖 10인의 전문 AI 에이전트 완전체 실행 준비 완료 🤖")
    print("=========================================================")
    print(" 1. 리서처 이안 (Ian) - 웹 검색 및 트렌드 조사")
    print(" 2. 시스템 분석가 케빈 (Kevin) - 하부 프로그램 전문 기술 해체/분석")
    print(" 3. 사용자 클로이 (Chloe) - 피드백/제안/테스트")
    print(" 4. 기획자 알렉스 (Alex) - 제품 기획 및 요구사항 정리")
    print(" 5. 디자이너 미아 (Mia) - 로고/색상/전체 레이아웃 설계")
    print(" 6. 아키텍트 소피아 (Sophia) - 시스템 아키텍처/DB 설계")
    print(" 7. API 관리자 루카스 (Lucas) - API 명세/보안 관리")
    print(" 8. 백엔드 데이비드 (David) - 서버 비즈니스 로직 작성")
    print(" 9. 프론트엔드 엠마 (Emma) - 클라이언트 UI 및 반응형 코딩")
    print(" 10. 최적화 라이언 (Ryan) - 찌꺼기 코드 삭제 및 속도 극대화\n")
    
    print("통합/확장할 기존 하부 프로그램 정보를 입력하세요. (종료: 빈 줄에서 Enter 2번)")
    
    lines = []
    while True:
        line = input()
        if not line and (not lines or not lines[-1]): break
        lines.append(line)
        
    sample_program = "\n".join(lines).strip()
    if not sample_program: sample_program = "단순한 로컬 파일 기반 주소록 시스템"
    
    final_output = run_agent_team(sample_program)
    
    with open("avengers_team_result.md", "w", encoding="utf-8") as f:
        f.write(final_output.raw if hasattr(final_output, 'raw') else str(final_output))
    print("\n✅ 모든 과정 완료! 최종 코드가 'avengers_team_result.md' 에 저장되었습니다.")
