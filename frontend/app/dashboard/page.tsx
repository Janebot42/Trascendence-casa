'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DashboardHero from '@/components/dashboard/DashboardHero';
import BoardCard from '@/components/dashboard/BoardCard';
import VelocityWidget from '@/components/dashboard/VelocityWidget';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import { ProtectedRoute } from '@/components/auth';

const activeBoards = [
  {
    title: 'Marketing Q4',
    updatedText: 'Updated 2 hrs ago',
    label: 'Q4 Priority',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC6m0bkauJ9UarMy2nSahfQna2RaBFZLLfAHIiqIA8Q8ga7bsRaRhjLqQuXo_q7kFb5GQAct_nDwaH7AAdUk3ny6OC7qhCpjGrAWgst2HVM8YB2QNirQTeEaV_RYVicg3EXClyUySnrVRKIb8xoIjEhvgSdX0j9rKc0mXLkU7UvbdYruhGaxK79GwX6HXxngrEAs97BYNFzjD36hrtJ-IQ7MWlaWQ9g3WWP4GiDgIHzmwIVjus4MtI5OA',
    avatars: [
      {
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5eloJj6fMhjoDR_4SDQIuM11CDWBH6d5uo6huj9uhurGqgA_mrdynC_20MgMAYuJVyc_cVEudoy99yTaLzf3VTv0QwcXXVrgC6RFyV4jrX7SHcQS3y3dX5hHTZ1gj5XROzf7732hqqmxYmM1WzNSqAa42l6GyiSltLZSrppD6w2BsyDiL010V0stVvmTj0f9FolhmUY5L9C7wXyzV_u0yXqq1XOGxnuL4LswHgkxhMEp9cxXkTPJNjQ',
        alt: 'User 1',
      },
      {
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-1h2jnoryEl2AQxAYitCabT0ns7JGF-7xgl6HUH2RkJhl2bW80Qpn5or1jf3WKbVsn_nPzal6wfH_b4Aq-y46lroWseP14_qIuPEfiKh4RXLDtKNiEVCKpaL_GiW8uHn0-8cViR-lclab1HrNgCzyyIDrOzwAVSRurinNQpsKiMv8FzPA7nutDbBXusys728wTXjcHeI8wnYZJkib6BMpuhOR8yJjw8FmSuZpsCgfPmDd6dE2Fb4u-A',
        alt: 'User 2',
      },
    ],
    progressPercent: 75,
    labelClassName: 'bg-secondary-container text-on-secondary-fixed',
    progressClassName: 'bg-primary',
  },
  {
    title: 'Website Redesign',
    updatedText: 'Updated 1 day ago',
    label: 'Design',
    href: '/',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBeTVcuiX735Tv0NIy-Y54SGxDaW_YpZIJv4nkpv3eI9GolKhp4Sd7iDBX5kfr2q5mAotlFPoRt3x0mRE4ZRcZe_q0YDi5cye1DTSuslbpueqhFhEpAVAnK2ERGktEtlVowHx2q3z7wSHRKH5zGfGRKi1C8E9nbuQgyqhVa7np8xG-xcz_NeMC6X1hWU6aIByZWW3OlKRs1tQoiNyrksCEmaGCag7EQGJG-09_MsOjOAeffPFhJLlPJYQ',
    avatars: [
      {
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5xJl1UAqKyNieMP2cIOOvO5ogEofDnhyrvsvMnSebKTIQwhZSkq16nm0RaU_6TzM3QRZ3RO17ibWrcsOQKAoN3_hrAh5Z6lZQo3DQkarKlZkAPExN6Y2dU3851SWqjd0HdHjIdGQB1Kojd94gDcAL7OVXjDY7I7OQKTwDmlE4nF8wyBEAm_2pZVkzESzHUBAwX0ECFVaYoYKNBgpVuzzJZZUucqqOOlL6fHgx445gpwoEP93lNbWxbg',
        alt: 'User 3',
      },
    ],
    progressPercent: 30,
    labelClassName: 'bg-primary text-white',
    progressClassName: 'bg-primary-container',
  },
  {
    title: 'Product Launch',
    updatedText: 'Updated 3 days ago',
    label: 'Launch',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBMU7om3wSC3rCwPhEzdMSvUN67BcI-DpEA4Vwiu-Nfbp9h8-1kEZhBRKuHtZEqslf0GuBkEZWHO7B9Mcsc0-13suMNCqMsG6DmbSHHeW_2rVIc8SdWWueKT0-6AKPmjhXdqA9jzgXcLARm5OC97eJu1L75Zoxsux5QWfEepN2phqvIbAK9KD2QxNtj3Au5hEELF2BAtYEFiz5IF39gUoJNTc_LXNaLUBgLhzt70MQmI5BvbBU8pJGxBA',
    avatars: [
      {
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGu9LUugkaFnd2XLJh3JGIjQ-K0orS0bIbFixjbpZ3l9aY3TJZgllqohivSgDLEXaEH0y3LIM6J0YKgD5IcBvqwH4-Dg1Iij-o7bnyluW4Jccrxpyoja9wE1FDwtYReKpaRHaDckoDDUbuCFpMgRHRwH2w8VvmcptUfJU8M7nkRLfn6ChcuN1vGDwaP43yU774_laUWoXgijxRNDxnLsEkJztZbwjXtQWpvePU-azVT8Bwu4-gsvo86A',
        alt: 'User 4',
      },
      {
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMMtohyqrrLPTt1q6pQP0WJuMWgQUwO6S5REVrJF3eJYc49gYTGCbFs_tGl8o0Cy90GYUf7MFQaGtmTUCTCT8Wee9mpmOLmESuRlUXgKnUVBDISy2rXucA8AoCrBZX3CZ1_QzeX8kjWaZTjPgkepsNUkTVaqebhR-mNcqwUW9zQ2yRRiytLUGFu_PCR9VwlsHUbh1_rago23QRtNPzVQg-8yaV3k39LWSMJe5iXDKtjr2GGw4JJzgfJg',
        alt: 'User 5',
      },
    ],
    progressPercent: 90,
    labelClassName: 'bg-secondary-container text-on-secondary-fixed',
    progressClassName: 'bg-primary',
  },
];

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenNewTaskModal={() => alert('New Task created from Dashboard!')}
        />

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <DashboardHero
            title="Good Morning, Jane"
            subtitle="Here's what's happening across your projects today."
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[18px] font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline">
                      view_cozy
                    </span>
                    Active Boards
                  </h3>
                  <button
                    onClick={() => alert('View All no está implementado todavía.')}
                    className="text-primary font-medium text-[13px] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {activeBoards.map((board) => (
                    <BoardCard key={board.title} {...board} />
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <VelocityWidget />
              <ActivityFeed />
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
