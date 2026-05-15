from crewai import Task

def create_tasks(agents, existing_program_desc):
    r = agents["researcher"]
    an = agents["analyst"]
    u = agents["user_tester"]
    p = agents["planner"]
    d = agents["designer"]
    a = agents["architect"]
    api = agents["api_manager"]
    b = agents["backend_dev"]
    f = agents["frontend_dev"]
    o = agents["optimizer"]

    # 0. 웹 검색 (Ian)
    task_research = Task(
        description=f'''다음 기존 프로그램과 관련된 최신 트렌드, 유사 서비스 사례를 웹에서 глубо이 있게 검색하세요.
[기존 프로그램]
{existing_program_desc}''',
        expected_output='웹 검색 기반의 최신 트렌드 및 경쟁사 요약 보고서',
        agent=r
    )

    # 1. 하부 프로그램 기술 분석 (Kevin - 새로 추가됨!)
    task_analysis = Task(
        description='주어진 기존 프로그램(하부 시스템)의 설명을 바탕으로, 현재 사용 중인 기술적 한계, 데이터 흐름의 문제점, 코드 구조적 취약점을 엔지니어의 관점에서 완벽하게 분석하고 해체하세요. 알렉스와 소피아가 이 시스템을 어떻게 병합/통합할 수 있을지에 대한 가이드를 제시해야 합니다.',
        expected_output='기존 하부 프로그램에 대한 완벽한 기술적 해부 및 구조적 취약점 분석 리포트',
        agent=an
    )

    # 2. 사용자 테스트 (Chloe)
    task_user_feedback = Task(
        description='기존 프로그램 설명을 보고 실사용자 입장에서 불편한 점을 찾고, 새로운 기능을 제안하세요.',
        expected_output='사용자 관점의 비판점 및 신규 기능 제안서',
        agent=u
    )

    # 3. 기획 (Alex)
    task_planning = Task(
        description='당신의 핵심 임무입니다. 케빈(분석가)이 넘겨준 하부 시스템 해부 리포트, 이안(리서처)의 웹 데이터, 클로이(사용자)의 피드백을 모두 종합하여 기존 프로그램의 통합/확장 기획안을 작성하세요.',
        expected_output='기술 분석, 최신 트렌드, 사용자 요구가 모두 반영된 최종 제품 기획 문서',
        agent=p
    )

    # 4. 디자인 (Mia)
    task_design = Task(
        description='기획안을 바탕으로 종합적인 디자인 시스템을 구축하세요 (로고, 색상, UI 구조).',
        expected_output='브랜드 아이덴티티 및 UI/UX 화면 설계 가이드',
        agent=d
    )

    # 5. 아키텍처 설계 (Sophia)
    task_architecture = Task(
        description='기획안과 디자인을 구현하기 위해 GCP 인프라와 Firestore 기반의 무지연 아키텍처를 설계하세요.',
        expected_output='시스템 아키텍처 다이어그램 및 기술 스택 명세',
        agent=a
    )

    # 6. API 설계 (Lucas)
    task_api = Task(
        description='프론트엔드와 백엔드가 통신할 내부 API 명세서 및 외부 API 연동 방안을 작성하세요.',
        expected_output='전체 API 명세서 및 통신 가이드',
        agent=api
    )

    # 7. 백엔드 코딩 (David)
    task_backend = Task(
        description='설계를 바탕으로 실제 DB 연동 및 비즈니스 로직을 처리하는 서버 코드를 작성하세요 (Try-Catch 필수).',
        expected_output='작동 가능한 백엔드 소스 코드',
        agent=b
    )

    # 8. 프론트엔드 코딩 (Emma)
    task_frontend = Task(
        description='디자인을 바탕으로 무지연 로딩이 적용된 프론트엔드 클라이언트 코드를 작성하세요.',
        expected_output='UI/UX가 적용된 프론트엔드 소스 코드',
        agent=f
    )

    # 9. 코드 최적화 및 리뷰 (Ryan)
    task_optimize = Task(
        description='작성된 모든 코드를 검토하여 에러를 삭제하고 찌꺼기 코드 없이 최고 성능을 내도록 리팩토링하세요.',
        expected_output='찌꺼기가 제거되고 무지연 성능으로 최적화된 최종 프론트엔드/백엔드 소스 코드',
        agent=o
    )

    return [
        task_research,
        task_analysis,
        task_user_feedback,
        task_planning,
        task_design,
        task_architecture,
        task_api,
        task_backend,
        task_frontend,
        task_optimize
    ]
