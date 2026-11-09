// Como uma conta aparece para os outros e para ela mesma: o nome escolhido ou o @usuário
export const displayName = profile => profile?.display_name || profile?.username || 'Alguém';
