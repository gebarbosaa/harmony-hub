/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AgendaRouteImport } from './routes/agenda'
import { Route as CalendarioRouteImport } from './routes/calendario'
import { Route as ConfiguracoesRouteImport } from './routes/configuracoes'
import { Route as CustosFixosRouteImport } from './routes/custos-fixos'
import { Route as FaturasRouteImport } from './routes/faturas'
import { Route as FluxoRouteImport } from './routes/fluxo'
import { Route as HabitosRouteImport } from './routes/habitos'
import { Route as InvestimentosRouteImport } from './routes/investimentos'
import { Route as ListaRouteImport } from './routes/lista'
import { Route as LoginRouteImport } from './routes/login'
import { Route as MaisRouteImport } from './routes/mais'
import { Route as MercadoRouteImport } from './routes/mercado'
import { Route as MetasRouteImport } from './routes/metas'
import { Route as OnboardingRouteImport } from './routes/onboarding'
import { Route as OrcamentoRouteImport } from './routes/orcamento'
import { Route as ParceladosRouteImport } from './routes/parcelados'
import { Route as TarefasRouteImport } from './routes/tarefas'
import { Route as AuthCallbackRouteImport } from './routes/auth.callback'
import { Route as AnotacoesRouteImport } from './routes/anotacoes'
import { Route as AssinaturaRouteImport } from './routes/assinatura'
import { Route as IntegracoesRouteImport } from './routes/integracoes'
import { Route as ResgateRouteImport } from './routes/resgate'
import { Route as TarefasDomesticasRouteImport } from './routes/tarefas-domesticas'

const make=(route:any,id:string,path:string)=>route.update({id,path,getParentRoute:()=>rootRouteImport} as any)
const IndexRoute=make(IndexRouteImport,'/','/')
const AgendaRoute=make(AgendaRouteImport,'/agenda','/agenda')
const CalendarioRoute=make(CalendarioRouteImport,'/calendario','/calendario')
const ConfiguracoesRoute=make(ConfiguracoesRouteImport,'/configuracoes','/configuracoes')
const CustosFixosRoute=make(CustosFixosRouteImport,'/custos-fixos','/custos-fixos')
const FaturasRoute=make(FaturasRouteImport,'/faturas','/faturas')
const FluxoRoute=make(FluxoRouteImport,'/fluxo','/fluxo')
const HabitosRoute=make(HabitosRouteImport,'/habitos','/habitos')
const InvestimentosRoute=make(InvestimentosRouteImport,'/investimentos','/investimentos')
const ListaRoute=make(ListaRouteImport,'/lista','/lista')
const LoginRoute=make(LoginRouteImport,'/login','/login')
const MaisRoute=make(MaisRouteImport,'/mais','/mais')
const MercadoRoute=make(MercadoRouteImport,'/mercado','/mercado')
const MetasRoute=make(MetasRouteImport,'/metas','/metas')
const OnboardingRoute=make(OnboardingRouteImport,'/onboarding','/onboarding')
const OrcamentoRoute=make(OrcamentoRouteImport,'/orcamento','/orcamento')
const ParceladosRoute=make(ParceladosRouteImport,'/parcelados','/parcelados')
const TarefasRoute=make(TarefasRouteImport,'/tarefas','/tarefas')
const AuthCallbackRoute=make(AuthCallbackRouteImport,'/auth/callback','/auth/callback')
const AnotacoesRoute=make(AnotacoesRouteImport,'/anotacoes','/anotacoes')
const AssinaturaRoute=make(AssinaturaRouteImport,'/assinatura','/assinatura')
const IntegracoesRoute=make(IntegracoesRouteImport,'/integracoes','/integracoes')
const ResgateRoute=make(ResgateRouteImport,'/resgate','/resgate')
const TarefasDomesticasRoute=make(TarefasDomesticasRouteImport,'/tarefas-domesticas','/tarefas-domesticas')

const rootRouteChildren={IndexRoute,AgendaRoute,CalendarioRoute,ConfiguracoesRoute,CustosFixosRoute,FaturasRoute,FluxoRoute,HabitosRoute,InvestimentosRoute,ListaRoute,LoginRoute,MaisRoute,MercadoRoute,MetasRoute,OnboardingRoute,OrcamentoRoute,ParceladosRoute,TarefasRoute,AuthCallbackRoute,AnotacoesRoute,AssinaturaRoute,IntegracoesRoute,ResgateRoute,TarefasDomesticasRoute}
export const routeTree=rootRouteImport._addFileChildren(rootRouteChildren)

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
 interface Register {
  ssr:true
  router:Awaited<ReturnType<typeof getRouter>>
  config:Awaited<ReturnType<typeof startInstance.getOptions>>
 }
}
